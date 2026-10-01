# Task 7b rework run and its round-2 findings

Agent-facing stage record for draft docs stage 2a, task 7b (the pilot rework). Written 2026-10-01 from the run result JSON and the per-agent journal. Source of truth for what the round-2 readers said; nothing here is a ruling.

## Run

- Run: `wf_f5f6eb81-c35`, on runner dotfiles `5fb8ce2`.
- Args: `bothReviewers: true`, `inFlight: 3`; every page ran as a `rework` page (the owner rulings of 2026-09-30 and 2026-10-01 carried as each page's rework text).
- Cost: 56 agents, 5,120,429 subagent tokens, run result `spent` value 829733.
- Outcome: all six pages escalated after round 2 (reason on every page: "second fix verdict or red gate"). No page was accepted.
- The final reader read ran on no page. It runs only after acceptance, so none reached it.
- Every round-2 drafter gate (`check:docs-gate`, light lane) passed. The escalations are all reader verdicts, not red gates.
- An earlier run, `wf_55b254af-82a`, loaded a stale runner (`5d5ecb9`) by name, was stopped, and its output was discarded. Nothing from it is recorded here.
- The WIP commit holding the six reworked pages and their briefs is `a6885750` on `draft-docs-2a`.
- Seats: S = structural edit, R = register editor, F = fact read, Fig = figure verifier (runs only on pages that carry a figure: replace-magic-links, add-a-custom-admin-screen, architecture).

## Verdicts

| Page | Round 1 verdicts | Round 2 verdicts | Round 2 blocking counts |
|---|---|---|---|
| replace-magic-links-with-cloudflare-access | S fix, R accept, F accept, Fig fix | S fix, R accept, F accept, Fig accept | S 1, R 0, F 0, Fig 0 (total 1) |
| security-model | S fix, R fix, F fix | S fix, R fix, F accept | S 2, R 5, F 0 (total 7) |
| add-cairn-to-a-sveltekit-app | S fix, R fix, F fix | S fix, R fix, F fix | S 1, R 2, F 2 (total 5) |
| add-a-custom-admin-screen | S fix, R fix, F fix, Fig accept | S fix, R fix, F accept, Fig accept | S 2, R 3, F 0, Fig 0 (total 5) |
| theme-your-public-site | S fix, R fix, F fix | S fix, R fix, F accept | S 3, R 2, F 0 (total 5) |
| architecture | S fix, R fix, F accept, Fig accept | S accept, R fix, F fix, Fig accept | S 0, R 2, F 1, Fig 0 (total 3) |

Round-1 blocking counts, for reference: replace-magic-links-with-cloudflare-access: S 1, R 0, F 0, Fig 1 (total 2); security-model: S 1, R 4, F 5 (total 10); add-cairn-to-a-sveltekit-app: S 4, R 3, F 3 (total 10); add-a-custom-admin-screen: S 3, R 2, F 2, Fig 0 (total 7); theme-your-public-site: S 1, R 2, F 3 (total 6); architecture: S 3, R 2, F 0, Fig 0 (total 5).

Totals: round-2 blocking findings across the six pages are 26 (security-model 7, add-cairn-to-a-sveltekit-app 5, add-a-custom-admin-screen 5, theme-your-public-site 5, architecture 3, replace-magic-links-with-cloudflare-access 1).

## Pages

Each page section holds the round-2 blocking findings verbatim as the reviewer gave them (line references are the page as committed in `a6885750`), then the non-blocking findings as one short list (location and the opening sentence; full text is in the run result JSON), then the drafter's `couldNotDo` and `frictionFiled` for each round. Em dashes in reviewer text were replaced with hyphens for this record.

### replace-magic-links-with-cloudflare-access

Status: escalate (second fix verdict or red gate). Page: `docs/extend/replace-magic-links-with-cloudflare-access.md`.

#### Round-2 blocking findings

Seat: structural edit

````text
- [BLOCKING] docs/extend/replace-magic-links-with-cloudflare-access.md:12: The introduction breaks the register's introduction rule ("The page anatomies": the introduction "states the page's subject and never describes the page itself"). It also fails Google's prior-knowledge item as that rule frames it. The sentence "This page assumes a site whose guard already signs editors in by magic link" states the prior knowledge through the page describing itself.
  rewrite: State the assumption as a fact about the reader's site: "You need a site whose guard already signs editors in by magic link, as [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) sets it up."
````

#### Round-2 non-blocking findings

- (structural edit) docs/extend/replace-magic-links-with-cloudflare-access.md:86-89: Task-guide anatomy item 2 says each precondition carries a link to whatever produces it.
- (structural edit) docs/extend/replace-magic-links-with-cloudflare-access.md:157-158: Pacing: step 2 asks the reader to export the team domain and the gate's logout address before the page says where to find either.
- (structural edit) docs/extend/replace-magic-links-with-cloudflare-access.md:199-204: Logical order: the illustrative resolver returns `invalid` for every failure, and the paragraph after it says a better verifier returns `audience` so the failure logs at error.
- (structural edit) docs/extend/replace-magic-links-with-cloudflare-access.md:44-46, 67-68: The diagram caption and the opening of "Prepare the roster" both state that the two admission lists never reconcile automatically.
- (structural edit) docs/extend/replace-magic-links-with-cloudflare-access.md:58: A stray sentence about the stability tier sits after the cross-link to the sign-in email, in a section about the decision to switch.
- (structural edit) docs/extend/replace-magic-links-with-cloudflare-access.md:242-244: The explanation section's heading is a noun phrase in a task guide.
- (register editor) docs/extend/replace-magic-links-with-cloudflare-access.md:86-89 (step 2 sub-paragraph, changed): "The `bootstrapOwner` pair that [Compose the runtime and the admin](...) sets lives only in the magic-link routes, which the `identity` branch never reaches." This is a garden path: with the link title as the subject of the rel...
- (register editor) docs/extend/replace-magic-links-with-cloudflare-access.md:203-204 (changed): "A verifier that returns `audience` for an AUD mismatch gets that failure logged at error." This restates the rule two sentences earlier ("logs an identity refusal at error when its reason is `audience`...").
- (register editor) docs/extend/replace-magic-links-with-cloudflare-access.md:44-46 (figure caption, changed): "The two lists never reconcile automatically." This repeats line 67-68 ("two independent admission lists that never reconcile automatically") almost word for word, which is the restatement tell across sections.
- (register editor) docs/extend/replace-magic-links-with-cloudflare-access.md:269-270 vs 292-293 (verify step 2 and new resolve step 3): The new failure section duplicates the verify step's sub-paragraph.
- (register editor) docs/extend/replace-magic-links-with-cloudflare-access.md:292-293 (resolve step 3, new): "Otherwise, find the request's `guard.refused` record with `reason: identity`, and read the refusal's reason in its `detail`." This step joins two imperatives (find, read), against the brief's "Each step holds one action." It i...
- (register editor) docs/extend/replace-magic-links-with-cloudflare-access.md:296-297 (resolve step 5, new): The diagnostic covers `missing` and `invalid` only.
- (register editor) docs/extend/replace-magic-links-with-cloudflare-access.md:290-291 (resolve step 2, new): Flag for the claims checker.
- (register editor) docs/extend/replace-magic-links-with-cloudflare-access.md:9-10 (introduction, new): "...when its editors already hold accounts in the organization's IdP ...
- (register editor) docs/extend/replace-magic-links-with-cloudflare-access.md:19, 298, 306, 308, 310 (new links): These links point at add-a-second-sign-in-group.md, debug-your-site.md, restrict-admin-access.md, and share-a-draft-preview.md, and none of those files exists in the worktree's docs/extend/.
- (fact read) docs/extend/replace-magic-links-with-cloudflare-access.md:87-89 (Prepare the roster, step 2): The rework split the bootstrap sentence and left an unwrapped prose line of 133 characters ('sets lives only in the magic-link routes, ...
- (fact read) docs/internal/briefs/extend/replace-magic-links-with-cloudflare-access.json (intro sentence 'The work spans the site's server hooks and the Cloudflare account's Zero Trust settings...'): The brief tags this sentence no-claim.
- (figure verifier) docs/extend/replace-magic-links-with-cloudflare-access.md:23: EARNS ITS PLACE.
- (figure verifier) docs/extend/replace-magic-links-with-cloudflare-access.md:46: The caption's last sentence ('A `/preview/<token>` request reaches the Worker without passing the application.') nearly repeats the last sentence of accDescr ('A preview request reaches the Worker without passing the applicatio...
- (figure verifier) docs/extend/replace-magic-links-with-cloudflare-access.md:23: The outline's figure note says /healthz is shown outside the application, but the diagram leaves it out.

#### Drafter notes

Round 1 gate: pass.

Round 1 `couldNotDo`:

- The cairn-figure skill asks for a figure-verifier dispatch on any page that carries a figure. This drafting seat has no agent-dispatch tool, so that dispatch is still owed. The mermaid diagram is unchanged from the prior draft.
- The outline's figure note puts /healthz outside the Access application. None of the handed fact ids covers /healthz, so the diagram still leaves it out. Adding it needs page inputs to trace a /healthz fact.
- The new failure-path section and the see-also section link three pages that are outlined but not built yet: debug-your-site.md, restrict-admin-access.md, and share-a-draft-preview.md. The sibling pages already link unbuilt outlined pages the same way, and the gate passed.

Round 1 `frictionFiled`:

- (none)

Round 2 gate: pass.

Round 2 `couldNotDo`:

- Figure-verifier BLOCKING finding (show /healthz outside the Access application) is not fixed, because none of the dispatched fact ids covers /healthz. The fact it needs is f:paotzb (extend.md:784): '/healthz sits at the site root, outside /admin, so the auth guard does not gate it'. It is verified but not in this page's fact ids, so I did not draft the node, the accDescr clause, or the caption sentence. Once page inputs add f:paotzb, add a health node in the Worker subgraph with an edge `browser -->|"/healthz"| health`, extend accDescr's last sentence, and end the caption with 'A `/healthz` check also reaches the Worker without passing the application.'
- Not taken, advisory only: moving 'Logout and session lifetime under Access' after the recovery section. That move would put a concept section between the failure path and See also, which breaks the anatomy as badly as the current placement, and it would depart from the outline order.
- Not taken, optional: a dashed workers.dev bypass edge in the diagram. Adding it would widen the figure past the scope of this redraft.
- Not answered here: the relayed user question about how the pass is going and whether the final readers help. That needs the conductor's run-level view. From this page, the readers' findings were concrete and actionable. Fixing them added a missing out-of-scope statement to the introduction, moved the Access definition ahead of the API names, added a `missing` diagnostic step, and removed a duplicated remedy. The fact-read and provenance checks also caught two fact-citation mismatches, which I fixed.

Round 2 `frictionFiled`:

- (none)

### security-model

Status: escalate (second fix verdict or red gate). Page: `docs/extend/security-model.md`.

#### Round-2 blocking findings

Seat: structural edit

````text
- [BLOCKING] docs/extend/security-model.md:3: Google 'What the document covers' / 'Does your introduction provide an accurate overview of the topics you cover?' and the concept anatomy's 'overview of the content the page covers': the introduction (lines 3-14) names the attacker, the defenses-plus-residual-risks pattern, prior knowledge, and the out-of-scope tasks, but never names the areas the page assesses. A reader of the intro cannot tell that the page covers render safety, the GitHub App's reach, log contents, identity mode, the auth channel, or the dev-backend refusals. The intro also frames the attacker as an editor-account holder only, while the auth channel section (line 365) defends against an unauthenticated caller.
  rewrite: Add one or two sentences to the opening paragraphs that name the covered areas in page order: magic-link sign-in and its browser binding, the session cookie, CSRF and the guard's headers, the access map's limits, render safety, the GitHub App's reach, logs, and the residual risks of replacing sign-in with an identity gate or adding an auth channel. Widen the attacker sentence to include the anonymous caller of a member sign-in form.
````

Seat: structural edit

````text
- [BLOCKING] docs/extend/security-model.md:421: Red Hat 'Information is presented in the most logical order and location' and Google 'introduces information when it's most relevant': the order departs from the outline's covers list without a better logic. The guard's step 1 (line 180) names the dev-backend tripwire with reason dev_backend_in_prod, but 'Dev-backend refusals' explaining it sits last (line 421), about 240 lines later, after the auth channel. The outline places it right after the guard. 'Log contents' (line 330), last in the outline, sits between the GitHub App section and 'Identity mode's threat surface', which splits the replaced-seam material (identity, channel) from the access map and guard material it depends on.
  rewrite: Move 'Dev-backend refusals' to directly after 'The auth guard' (outline order), or at minimum link step 1 of the guard list to it. Move 'Log contents' to the end of the body, just before 'The site's responsibilities'. Either restore the outline order (identity mode after the access map, then the auth channel, render safety, the GitHub App, logs), or keep the built-in-defenses-then-replaced-seams grouping and state it in the introduction.
````

Seat: register editor

````text
- [BLOCKING] docs/extend/security-model.md:16-20 (default-identity paragraph, second sentence): The rework ruling says the default-identity paragraph follows unchanged, but this sentence was rewritten. The rewrite also adds a restatement tell: the previous sentence opens "Under the zero-config default", and this one calls the same defaults "a zero-config starting point". At 42 words it is now the page's longest sentence, and the added clause carries no new claim. The two sentences added after it (the `identity` hand-off and the auth channel) are defensible, since the job read asked for the auth channel to be introduced before first use. Keeping them is the conductor's call, but the original sentence should come back.
  rewrite: A developer can replace those defaults, the owner and editor roles and magic-link sign-in, with their own auth framework, after which cairn mints no session and reads an owner or editor identity through a defined hand-off.
````

Seat: register editor

````text
- [BLOCKING] docs/extend/security-model.md:29-30 (Magic-link sign-in lead-in) against :5 (introduction): Cross-section contradiction (Russell dimension). The introduction says "An anonymous visitor reaches nothing behind `/admin` except the sign-in form." Twenty-four lines later the hand-off says "An anonymous visitor reaches only the sign-in form and the confirm page its link opens." A security reader who skims will see the page give two different anonymous surfaces. The introduction sentence is Geoff's verbatim text, and the docs-friction-log entry for f:v85shm already records that it understates the code (the guard's public admin paths include `/admin/auth/`). So the lead-in should not restate the anonymous surface at all. It can hand off from the introduction's attacker instead. The brief's tag for this sentence would then change from f:v85shm to no-claim.
  rewrite: An attacker who wants an editor's account needs the token behind a sign-in link, so that token is the first thing cairn defends.
````

Seat: register editor

````text
- [BLOCKING] docs/extend/security-model.md:58-61 (Browser binding lead-in): Restatement tell. The new lead-in says "cairn binds each sign-in to the browser that requested the link", and the next sentence repeats it: "A bound sign-in completes only in the browser that requested it." The hand-off and the cited fact (f:k3gfbi) fit in one sentence.
  rewrite: Once a token exists, a browser other than the requester's could spend it, so a bound sign-in completes only in the browser that requested it, and a confirm from any other browser refuses without consuming the token.
````

Seat: register editor

````text
- [BLOCKING] docs/extend/security-model.md:365-368 (Auth channel threat model lead-in): Restatement tell. The lead-in announces "a rule about whose identity may trigger a denial", and the next sentence restates it as "The auth channel rests on the rule that...". The hand-off spends a sentence previewing the claim the following sentence makes.
  rewrite: An auth channel's sign-in form takes a contact from an unauthenticated caller, so the channel rests on the rule that no control keyed on the victim's identity may deny, delay, or destroy anything, and denial keys only on the requester.
````

Seat: register editor

````text
- [BLOCKING] docs/extend/security-model.md:129-130 (CSRF protection lead-in): Non-sequitur. "A forged form post would act with the editor's session, so cairn moves the admin's CSRF check from SvelteKit into the guard." The forged-post risk is why a CSRF check exists at all. It does not explain why the check moves out of SvelteKit. The section's second paragraph gives the real reason: `no-referrer` makes a browser send `Origin: null`. The hand-off should tie the risk to having the check, and leave the move to the paragraph that explains it.
  rewrite: A forged form post would act with the editor's session, so every unsafe admin form post needs a CSRF check, and cairn runs that check in the guard in place of SvelteKit's.
````

#### Round-2 non-blocking findings

- (structural edit) docs/extend/security-model.md:12: Concept anatomy: the intro should state what is out of scope 'and the pages that cover it'.
- (structural edit) docs/extend/security-model.md:56: The outline suggested headings that preserve old slugs (#sign-in-binds-to-the-browser-that-asked, #the-session-cookie, #what-the-dev-backend-flags-two-refusals-leave-open, #an-access-map-is-not-a-whitelist, #recovering-whitelis...
- (register editor) docs/extend/security-model.md:9-11 (introduction, second paragraph): Two problems.
- (register editor) docs/extend/security-model.md:7-8, 12-14 (introduction, scope sentences): Page-describing-itself tell, and the anatomy's out-of-scope clause is only half met.
- (register editor) docs/extend/security-model.md:337-361 (Identity mode's threat surface): The structural fix for the job-read heading finding is applied unevenly.
- (register editor) docs/extend/security-model.md:363-419 (Auth channel threat model, depth): The job read asked for this section's depth to be tightened relative to the rest.
- (register editor) docs/extend/security-model.md:267-268 (Render safety lead-in): Equivocation and a mild figure.
- (register editor) docs/extend/security-model.md:106-107 (The session cookie lead-in): A cleft construction ("is what carries it") followed by "carries" again in the next sentence.
- (register editor) docs/extend/security-model.md:315-316 (The GitHub App's reach lead-in): Scope mismatch, which the claims checker should verify.
- (register editor) docs/extend/security-model.md:7 ("Each component cairn exposes"): Soft Names flag.
- (register editor) docs/extend/security-model.md:12, 21, 131, 215, 316, 340 (line wrap): Edited lines break the page's roughly 100-column wrap (line 131 runs to 167 characters, line 21 to 134).
- (fact read) docs/extend/security-model.md:18-20 (default-identity paragraph, first sentence; brief f:y3ljm0): The rework said this paragraph should follow the introduction unchanged.
- (fact read) docs/extend/security-model.md:10-11 (brief f:72xplg): "A site can add protection above any of these defenses" claims more than f:72xplg supports.
- (fact read) docs/extend/security-model.md:21-22 (brief f:8u4iiv): "A separate seam, the auth channel, signs users in on a site's member routes" cites f:8u4iiv, which is about the channel's origin check and supports the claim only indirectly.
- (fact read) docs/extend/security-model.md:28-29 (brief f:v85shm): "reaches only the sign-in form and the confirm page its link opens" is narrower than the code.
- (fact read) docs/extend/security-model.md:174-176 (brief f:7qqhda): The hand-off says the guard "also decides how an admin request fails and which headers its response carries".

#### Drafter notes

Round 1 gate: pass.

Round 1 `couldNotDo`:

- Deviation for the conductor's ruling, not a failure: Geoff's second introduction paragraph is kept in content but not verbatim. 'Each section below...' and 'The page ends with...' describe the page itself and refer to position, both against the register, so it now reads: 'Each component cairn exposes has defenses that cairn keeps and limits that leave a residual risk to the site, and [the site's responsibilities](#the-sites-responsibilities) collect those residual risks into one list. Those risks matter before a site replaces cairn's sign-in or access rules, and again before it ships.' The first paragraph is verbatim, and its attacker and anonymous-visitor sentences cite f:v85shm.
- Deviation for the conductor's ruling: to tighten the auth channel section, three carried facts no longer appear in its body. Two were cut because the outline's covers list does not include them: f:2w1yrc (the design history) and f:rv9gdc (it repeats the example-site closure that f:irs7fg already states in the dev-backend section). The third, f:s047l1 (the NIST guidelines), now appears only as a link in Related resources, External resources.
- Headings with inbound links keep their exact text so those links still resolve. #identity-modes-threat-surface is linked from replace-magic-links-with-cloudflare-access. #allowlist-semantics-from-an-exhaustive-map is linked from migration-notes. I did not use the outline's suggested 'Recovering whitelist semantics' heading because migration-notes now links the newer slug. To show what cairn defends apart from what it leaves to the site, each mixed section ends in a 'Limits of ...' H3, the heading pattern the register names as good.

Round 1 `frictionFiled`:

- (none)

Round 2 gate: pass.

Round 2 `couldNotDo`:

- I fixed every blocking finding. The 'floors, not ceilings' framing now has two sentences. The introduction says a site can add protection above any defense, as with kit.csp (f:72xplg). The defaults paragraph says the owner and editor roles and magic-link sign-in are a zero-config starting point that a developer can replace (f:y3ljm0). I used neither suggested rewrite word for word, because the register bans figurative language and the sanitize floor can be loosened through sanitizeSchema.
- The three dropped facts are back on the page and in the brief: f:2w1yrc (the earlier-designs lockout), f:s047l1 (NIST, which supports the External resources link again) and f:rv9gdc (the dynamic import of the example site's dev wiring).
- Access map coverage now has a '### Limits of access map coverage' heading, and the publishAll, tidy and dictionary, and partial-map paragraph sits under it. The allowlist paragraph is kept as '#### Allowlist semantics from an exhaustive map' so the anchor that migration-notes.md:370 cites still resolves.
- The dev-backend H2 is now 'Dev-backend refusals' with a '### Limits of the dev-backend refusals' heading. Its lead-in no longer claims the flag gates every transport; it is now 'A deployed Worker must never carry the CAIRN_DEV_BACKEND flag, so the engine refuses the flag in two places...' (f:tkpmxr). The 'enable contract' rewrite was not used because it repeated a later sentence.
- The GitHub App lead-in is now about what a leaked App credential can write: 'Every save and publish commits through the site's GitHub App, so the App's permissions set what its private key and installation token can write.' It is cited to f:gglwt4, whose source names the save and lifecycle paths.
- I also took the advisory lead-in fixes for magic-link (covers the confirm page), browser binding, CSRF (rewritten as 'cairn moves the admin's CSRF check from SvelteKit into the guard' so it does not repeat the next paragraph), access map ('admits to a guarded admin path'), identity ('cairn's part in sign-in') and the balanced intro sentence.
- I did not take the advisory to state the page's two-part order in the introduction, because that sentence would describe the page itself, which the register bans. I also did not add a Limits subheading to Identity mode, to keep the page from widening.
- The dispatch's id list does not include f:v85shm, but the ruled introduction sentences and the magic-link lead-in cite it, as the previous rework did and the fact read accepted. I kept it rather than drop owner-ruled text.
- On the user's question about the final readers: this seat saw only this page. The three reads together found five real defects here: three dropped carried facts and two lead-ins that contradicted their own sections (dev-backend, GitHub App). The gate and tellgrader had passed all five. Vale shows 0 errors and tellgrader 0 findings after the fix.

Round 2 `frictionFiled`:

- (none)

### add-cairn-to-a-sveltekit-app

Status: escalate (second fix verdict or red gate). Page: `docs/extend/add-cairn-to-a-sveltekit-app.md`.

#### Round-2 blocking findings

Seat: structural edit

````text
- [BLOCKING] docs/extend/add-cairn-to-a-sveltekit-app.md:1068: Fails Red Hat 'Module types are used correctly', 'Information is presented in the most logical order and location', and the outline's covers entry ('a closing section after the milestones, not a milestone'). 'Customize the sign-in email' is an H3 inside the production milestone. It sits after that milestone's verify and failure sections but before its practice exercise ('Apply an opt-in migration locally', 1141) and its checklist (1164). An optional, non-milestone section therefore breaks the milestone anatomy (steps, check, disclosure exercise, checklist) and separates the migration exercise from the auth-database step it practices. The intro's milestone list (9-14) never mentions the section.
  rewrite: Move 'Customize the sign-in email' and its three H4s out of the production milestone. Make it an H2 after '### Checklist for production' and before '## Summary', which leaves the production milestone ending in its exercise and checklist. Then add one line to the introduction after the milestone list, for example: 'A closing section customizes the sign-in email.' The forward link at line 996 (#edit-the-message-in-a-custom-sender) keeps working because the H4 slug does not change.
````

Seat: register editor

````text
- [BLOCKING] docs/extend/add-cairn-to-a-sveltekit-app.md:1000-1006, "Point the site at production": This is a logic contradiction in a changed sentence, and it blocks. The new lead says "Moving a dev-backend site to production takes the following three edits:" and lists the adapter values, the Wrangler entries, and `origin`. The next sentence then says "The adapter and the Wrangler config already carry their production values, so the content module's `origin` is the last edit." A reader who acts on the list redoes two edits that earlier sections of this milestone already made. The list items are also statements, so they don't read as edits the reader makes.
  rewrite: Moving a dev-backend site to production takes three edits. The earlier sections of this milestone made the first two, giving the adapter's `backend` and `email` real values and adding the `EMAIL`, `AUTH_DB`, and `PUBLIC_ORIGIN` entries to `wrangler.jsonc`. The last edit sets the content module's `origin` to the deployed origin. The hooks module needs no edit, because `__CAIRN_DEV_BUILD__` is `false` on a production build and the build drops the dev-backend import. (Keep the remaining two sentences as they stand.)
````

Seat: register editor

````text
- [BLOCKING] docs/extend/add-cairn-to-a-sveltekit-app.md:~1060-1140, "### Customize the sign-in email" placed inside "Move the site to production": This is a page-level structure problem, and it blocks. The rework ruling asked for less optional weight on the core path. The fix instead moved the whole optional sign-in-email section (two H4 subsections, two code blocks, and a build-and-deploy check) into milestone 4. It sits between "Resolve a production failure" and "Checklist for production", and the register's milestone anatomy (objectives, prior state, steps, checklist, disclosure block) has no slot there. The milestone also gained a new drill ("Apply an opt-in migration locally"). The reader who just published to production now crosses about 80 lines of optional material before the checklist that closes the milestone.
  rewrite: Close milestone 4 at its core path: "Resolve a production failure", then the opt-in migration drill as its disclosure block, then "Checklist for production". Move the email material after the checklist as one H2, `## Customize the sign-in email`, opening: "A site that keeps the engine's sign-in email needs nothing from this section." Keep "Rebrand the email" and "Edit the message in a custom sender" as H3s beneath it, then "## Summary" and "## Next steps".
````

Seat: fact read

````text
- [BLOCKING] docs/extend/add-cairn-to-a-sveltekit-app.md:3, sentence 1 (brief index 0): Geoff's verbatim first sentence ('cairn gives a SvelteKit site an admin at `/admin`, where editors sign in by email and publish their markdown edits through a GitHub App you register.') is cited to f:dqe7ij. That fact covers only createCairnAdmin's load/actions/shellLoad and the CairnAdmin/CairnAdminShell mount. It says nothing about email sign-in, publishing, or a GitHub App the site registers. The claim has no fact behind it, which breaks the rework's 'cite each claim in it' instruction.
  rewrite: Keep the sentence verbatim and re-cite it in the brief to f:gyu7jc, an outline fact: each site registers its own GitHub App, and the engine ships no App or shared credential. The email sign-in half is backed on the page by f:xhwl32 and f:2gtftn if the brief needs a second anchor.
````

Seat: fact read

````text
- [BLOCKING] docs/extend/add-cairn-to-a-sveltekit-app.md:3, sentence 3 (brief index 2): 'To start a new site without the walkthrough, the setup command, `create-cairn-site`, scaffolds a complete site with its theme in one step, and [Scaffolded site files](scaffolded-site-files.md) explains what it writes.' is cited to f:5f4kmk. That fact covers the commit identity (installation token, editor as author, App bot as committer) and does not support the scaffolding claim. No outline fact states that create-cairn-site scaffolds a complete themed site. f:xyizai covers only the scaffold's adapter.
  rewrite: Keep the sentence verbatim and re-cite it in the brief to f:u705t5 (docs/internal/facts/front-door.md:66, [verified]: 'create-cairn-site scaffolds a complete starter called Waymark'). The inventory already carries non-outline facts such as f:k16chc, so a cross-arm citation is allowed.
````

#### Round-2 non-blocking findings

- (structural edit) docs/extend/add-cairn-to-a-sveltekit-app.md:250: The outline puts the site config, parseSiteConfig, and the minimal adapter in milestone 3 and the dev-backend section after milestone 3.
- (structural edit) docs/extend/add-cairn-to-a-sveltekit-app.md:30: The prerequisites give two different triggers for the Workers Paid plan.
- (register editor) docs/extend/add-cairn-to-a-sveltekit-app.md:1174-1176, "## Summary": The summary has list cadence in prose.
- (register editor) docs/extend/add-cairn-to-a-sveltekit-app.md:1162, step 4 of "Apply an opt-in migration locally": "Delete the copied file, unless the site will mint draft-preview links." states its condition after the instruction (the structure checklist's condition-first rule) and trips Vale's Google.Will.
- (register editor) docs/extend/add-cairn-to-a-sveltekit-app.md:191, milestone 2 objective list: In "Hand CSRF for the admin to the engine's guard, so a form posted without JavaScript reaches it.", the pronoun "it" could refer to the guard, the admin, or CSRF.
- (register editor) docs/extend/add-cairn-to-a-sveltekit-app.md:44-46, 652-654, 828-832 (objective lists): Three objective items put a comma before a second verb that shares the item's subject: "Register a GitHub App, and pass its identity to the adapter.", "Build the content index, and commit the manifest...", and "Publish an edit,...
- (register editor) docs/extend/add-cairn-to-a-sveltekit-app.md:547-552, after "Verify the dev sign-in" steps: The Windows forms of step 1 now come after a three-step procedure, so a Windows reader runs the POSIX command in step 1, sees it fail, and only then finds the alternative.
- (register editor) docs/extend/add-cairn-to-a-sveltekit-app.md:~466 ("Define the build flag and hand off CSRF" body): This is a scope note for the conductor.
- (register editor) docs/extend/add-cairn-to-a-sveltekit-app.md:801 and ~1062: The page repeats one sentence shape: "This exercise is optional, and no later milestone depends on it." and "This section is optional, and the production checklist does not depend on it." This is the recycled-phrase tell, and u...
- (register editor) docs/extend/add-cairn-to-a-sveltekit-app.md:187-191 vs 553-575: The milestone 2 objectives promise that the dev backend "keeps every save and publish on your machine", but the rework cut the old verification steps that saved an edit against the in-memory backend.
- (register editor) docs/extend/add-cairn-to-a-sveltekit-app.md:1174, tellgrader scaffold-header: This is a deterministic fact carried as reported: tellgrader flags `## Summary` as a scaffold header.
- (fact read) docs/extend/add-cairn-to-a-sveltekit-app.md:5, sentence 'By the end, Field Notes runs in production, and an editor can sign in, edit the post, and publish it to the deployed site.' (brief index 4): The sentence is cited to f:m0ouh8, which supports only a manual publish whose commit lands on `main`.
- (fact read) docs/extend/add-cairn-to-a-sveltekit-app.md:451-453 (Wire the dev backend and the CSRF handoff): The rework dropped the sentence "`checkOrigin` is deprecated as of SvelteKit 2.61 in favor of `csrf.trustedOrigins`, and it stays supported across the engine's tested range." The page now tells the reader to set a deprecated op...
- (fact read) docs/extend/add-cairn-to-a-sveltekit-app.md:1068 (### Customize the sign-in email): The outline's covers places 'Customize the sign-in email' as 'a closing section after the milestones, not a milestone'.

#### Drafter notes

Round 1 gate: pass.

Round 1 `couldNotDo`:

- Intro sentence 3 is Geoff's text, verbatim: "To start a new site without the walkthrough, the setup command, `create-cairn-site`, scaffolds a complete site with its theme in one step...". None of the fact ids I was given carries that claim. The container's fact for it is f:y6n5ma (admin facts), and it was not handed to this page. The brief cites f:5f4kmk, the closest handed id, which passes the mechanical check but does not support the claim. Re-run page inputs to add f:y6n5ma or an equivalent create-cairn-site scaffolding fact, then re-cite.
- Intro sentence 1 is also Geoff's text, verbatim: "cairn gives a SvelteKit site an admin at `/admin`, where editors sign in by email and publish their markdown edits through a GitHub App you register." No handed fact covers it whole. The brief cites f:dqe7ij, the admin mount, because the sentence needs a fact containing `/admin`. A fact covering sign-in by email plus publishing through the site's own App (for example f:cjonmm with the magic-link fact) needs to come in through page inputs.
- Intro sentence 5 is Geoff's text, verbatim: "...an editor can sign in, edit the post, and publish it to the deployed site". It cites f:m0ouh8. As drafted, the tutorial deploys only by hand, so a publish commits to main but does not change the deployed site until the next build and deploy. The summary states that accurately (f:k16chc), and the friction entry above records the gap. I left Geoff's sentence unchanged because it is his ruling. He decides whether to reword it or add a build-on-push step.

Round 1 `frictionFiled`:

- Filed 2026-09-30 by the restructure of `docs/extend/add-cairn-to-a-sveltekit-app.md` (draft docs stage 2a): extender, a publish lands on main but the hand-deployed, prerendered site keeps the old body until the next manual build and deploy, so the owner-ruled intro's "publish it to the deployed site" goes further than the walkthrough does (f:m0ouh8, f:k16chc, f:9ug9mo)

Round 2 gate: pass.

Round 2 `couldNotDo`:

- The fact read's blocking citation fixes for introduction sentences 1 and 3 (Geoff's verbatim text) are not done. Both need fact ids outside this dispatch: f:4zpvor for sentence 1 (email sign-in and GitHub-App publishing) and f:u705t5 for sentence 3 (create-cairn-site scaffolds a complete starter). The sentences stay as Geoff wrote them and keep their old citations, f:dqe7ij and f:5f4kmk, which back only part of each claim. Add both ids to the page's fact list and move the citations.
- The 'Show me the steps' answers are not collapsible. A <details>/<summary> block fails check:provenance, because its closing tags extract as the paths /details and /summary on a no-claim line. Every milestone now has a try-first exercise, and each answer sits under a '#### Show me the steps' heading instead. I filed this in the friction log; a fix to the checker would let the pages switch to <details>.
- The milestone 2 edit-and-save check was cut, not moved, because the dev backend's in-memory repository serves fixed sample posts and never reads the site's src/content. Stating that needs a fact not in this dispatch (the friction log already records it at the existing entry near line 258). Milestone 2 now checks only the sign-in, which is what the outline specifies. The edit-and-publish check runs in production only, and now continues through git pull, build, deploy, and the deployed permalink, so it delivers what the overview promises.
- Not changed: define-an-adapter-and-schema, build-the-public-routes, and configure-media are stage 2b pages, so their links stay pending until 2b lands. The outline's cross-links require them, and docs-links counts them as pending.

Round 2 `frictionFiled`:

- Filed 2026-09-30 by the second redraft of `docs/extend/add-cairn-to-a-sveltekit-app.md` (draft docs stage 2a): check:provenance reads the `</details>` and `</summary>` closing tags as rooted paths, so the disclosure block the tutorial-milestone anatomy requires cannot pass (contributor)

### add-a-custom-admin-screen

Status: escalate (second fix verdict or red gate). Page: `docs/extend/add-a-custom-admin-screen.md`.

#### Round-2 blocking findings

Seat: structural edit

````text
- [BLOCKING] docs/extend/add-a-custom-admin-screen.md:212-257: Tasks reflect the intended goal, and the intro and outline match (Google: check the whole document against the expectations you set). The outline lists 'Toolkit props that change behavior (AdminTable density and zebra, EmptyState headingLevel, Pagination's conditional range line and size select) ... and MediaPicker's entries and selection'. The page covers only ExpandableRow's data-cairn-inert-cell (line 348). It never mentions AdminTable density or zebra, EmptyState headingLevel, Pagination's range line or size select, or MediaPicker.
  rewrite: Under 'Compose the screen from the toolkit', add a short subsection (for example 'Set the props that change behavior'). Open it with one sentence tying it to the task, then give one line each for AdminTable density and zebra, EmptyState headingLevel, Pagination's conditional range line and size select, and MediaPicker's entries and selection, linking each to its admin-toolkit reference anchor. Leave the upload protocol to configure-media, per the outline's out-of-scope list.
````

Seat: structural edit

````text
- [BLOCKING] docs/extend/add-a-custom-admin-screen.md:255-257: Tasks reflect the intended goal: the outline's 'Engine components as building blocks' item names CairnAdminShell's themeOverride, EditPage's spellcheckOverride, and ContentFormFailure for a content route's form prop. 'Mount an engine admin component' delivers only themeOverride. The other two components are missing, though the reference documents both (admin.md:252-280).
  rewrite: Add a sentence each: EditPage's spellcheckOverride as the seam a host outside a real editing session uses to own the spellcheck setting, and ContentFormFailure as the type a content route passes to an engine component's form prop so a refused action's message reapplies. Link both to their admin.md entries.
````

Seat: register editor

````text
- [BLOCKING] docs/extend/add-a-custom-admin-screen.md:378-394 (## Animate the screen): Rework item not met. The job read found that motion "is a rule catalogue where the outline asked for a citation." The section is still a catalogue: a token inventory (382), the reduced-motion rule (384), a three-rule list (386-390), a scope paragraph (392), and then the two links (394). Only the motion-band/reduced-motion sentence and the hover-split fix were dropped. The heading is also a task heading with no step under it (brief checklist: task heading starts with a bare infinitive, and a concept section takes a noun phrase). The admin grammar tokens entry does not list the duration tokens, and the reduced-motion opt-back-in has no published reference home (only docs/internal/admin-design-system.md#motion, which the cairn-audit entry already links). Cutting 384 outright would therefore lose a fact. Either keep one sentence of it or file the missing reference home as friction.
  rewrite: ## Animate the screen

When a screen animates, `cairn-audit` holds its motion to the same error-tier rules as the engine's screens, so each transition names its duration and easing with the admin's motion tokens.

- In the screen's markup or scoped `<style>` block, write each duration as a `--cairn-dur-*` `var()` and each easing as a `--cairn-ease-*` `var()`.

A bare `transition-*` utility already animates on `--cairn-dur-base` and `--cairn-ease-standard`, which both admin theme roots set as Tailwind's defaults. Under `prefers-reduced-motion: reduce`, the admin collapses every duration to `0.01ms`, and only a paint transition may opt back in. [The static rules](../reference/cairn-audit.md#the-static-rules) entry states what `motion-property`, `motion-vocabulary`, and `motion-hover-gate` check, and [What the motion rules don't cover](../reference/cairn-audit.md#what-the-motion-rules-dont-cover) lists their exemptions. A site whose admin screens live outside the default roots names them under `static.adminScope`, as the [audit configuration](../reference/cairn-audit.md#configuration) describes.
````

Seat: register editor

````text
- [BLOCKING] docs/extend/add-a-custom-admin-screen.md:212, 255, 259 (## Compose the screen from the toolkit, ### Mount an engine admin component, ## Style the screen): The rework renamed three noun-headed blocks to task headings but gave none of them a task. Each section is exposition only, with no step and no one-step bulleted procedure. That breaks the brief's checklist: a task heading heads a task section, and a concept section takes a noun phrase. The task-guide anatomy also requires explanation to stay subordinate to a step, so these blocks still read as the job read described them: exposition between the steps and Verify. Each section needs one step for its lead-in to tie to. Within Style the screen, the paragraph on the scaffolded build (269) is the context a reader needs before the rules, so it belongs first.
  rewrite: Compose the screen from the toolkit, after its first paragraph:

- In the screen's `+page.svelte`, import the primitives the screen needs from `@glw907/cairn-cms/admin-toolkit`.

Mount an engine admin component:

A screen can also mount the engine's admin components beside the toolkit.

- In the screen's `+page.svelte`, import the component and set its props as the [admin components](../reference/admin.md) reference lists them.

`CairnAdminShell`'s [`themeOverride`](../reference/admin.md#cairnadminshell) prop, for example, pins the admin theme and removes the theme toggle.

Style the screen: open on the paragraph at 269 ("A scaffolded site already carries the build that compiles the site admin sheet. ..."), then add:

- Keep the screen's markup under `src/routes/admin` or `src/lib/admin`, the roots the site admin sheet scans.

Then keep the corner-ladder, `btn`, and status-text paragraphs.
````

Seat: register editor

````text
- [BLOCKING] docs/extend/add-a-custom-admin-screen.md:56 and :352: Each step holds one action (brief checklist, Google procedures). Gate step 2 ("add a separate `requireAccess` call and access-map entry") and row-detail step 1 combine two actions in two files: the call goes in the nested route's server file and the entry goes in the site's access map. Step 1 under row detail also restates Gate step 2 word for word, which is the restatement tell.
  rewrite: Gate the screen's reads and writes:
2. For each route nested under the screen, such as a detail endpoint, call `requireAccess` in that route's server file.
3. In the site's access map, add an entry for each nested route, as [Restrict admin access](restrict-admin-access.md) describes.
(renumber the wrapper step to 4)

Load row detail on demand:
1. Under the screen's directory, add the detail endpoint as a nested route, gated as [Gate the screen's reads and writes](#gate-the-screens-reads-and-writes) describes.
````

#### Round-2 non-blocking findings

- (structural edit) docs/extend/add-a-custom-admin-screen.md:9: Google intro item 'What the document doesn't cover', checked against the outline's outOfScope list.
- (structural edit) docs/extend/add-a-custom-admin-screen.md:259-271: Most logical order.
- (structural edit) docs/extend/add-a-custom-admin-screen.md:172-180: Information at the right pace.
- (structural edit) docs/extend/add-a-custom-admin-screen.md:378-394: The outline's Animate item asks the section to cite admin-design-system by heading.
- (structural edit) docs/extend/add-a-custom-admin-screen.md:49,182: Suggested headings 'Gate it' and 'Wire the AuditSink' are not used, so the old slugs #gate-it and #wire-the-auditsink do not resolve.
- (register editor) docs/extend/add-a-custom-admin-screen.md:57 and 92-98: The choice now comes before the snippet that depends on it, and step 3 is wrapper-neutral, so the job-read finding is mostly met.
- (register editor) docs/extend/add-a-custom-admin-screen.md:105: Missing middle step (logic).
- (register editor) docs/extend/add-a-custom-admin-screen.md:102: Register tightening: imperatives appear only in steps, task headings, cross-references, and notices.
- (register editor) docs/extend/add-a-custom-admin-screen.md:348 (ExpandableRow paragraph) and :359: Row detail is deeper now, but it still assumes `ExpandableRow` without a step or link that introduces it.
- (register editor) docs/extend/add-a-custom-admin-screen.md:59 and :90: Restatement tell.
- (register editor) docs/extend/add-a-custom-admin-screen.md:174: "A rate limit is optional." works as an optional marker, but it is a clipped standalone opener, the start of a short-sentence run.
- (register editor) docs/extend/add-a-custom-admin-screen.md:47 (last sentence): Overlinking and restatement.
- (register editor) docs/extend/add-a-custom-admin-screen.md:214, 257: Recycled phrase: "for one" appears in both changed paragraphs as the same aside ("`ManageEditors`, for one," and "`themeOverride`, for one,").
- (register editor) docs/extend/add-a-custom-admin-screen.md:361-376, 388-392 (for the claims checker): Facts to check, not ruled on here.
- (fact read) docs/extend/add-a-custom-admin-screen.md, "Load row detail on demand", the new `openDetail` ts block (after step 6): The new fenced handler is written for this page.
- (fact read) docs/extend/add-a-custom-admin-screen.md, intro sentence cited f:onqm6k ("A site adds one to manage data it keeps outside its markdown content...") and "The signups screen writes through `APP_DB`...": f:onqm6k is sourced from templates/waymark, while the page names the examples/showcase signups screen.
- (figure verifier) /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/add-a-custom-admin-screen.md:247: Earns its place.
- (figure verifier) /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/add-a-custom-admin-screen.md:247: Not a figure-rule failure: the outline asked for the signups screen with the dialog form, but the page embeds the minimal Events screen.
- (figure verifier) /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/add-a-custom-admin-screen.md:22: The directory tree is a `text` code block, not a figure.

#### Drafter notes

Round 1 gate: pass.

Round 1 `couldNotDo`:

- Could not dispatch the figure-verifier agent that the cairn-figure skill asks for after a figure edit, because this seat has no agent-dispatch tool. The repro fence (story toolkit/custom-screen) is unchanged, and the friction log already records that it shows an Events screen, not the signups screen the figure note asks for.
- The row-detail section does not say which ExpandableRow prop or event fires the open handler, because none of the dispatched fact ids names it. The illustrative handler takes the detail URL as a parameter and does not claim an ExpandableRow API.

Round 1 `frictionFiled`:

- (none)

Round 2 gate: pass.

Round 2 `couldNotDo`:

- Structural-edit BLOCKING finding 'Toolkit props missing' is not fixed. AdminTable density/zebra, EmptyState headingLevel, and Pagination's range line and size select rest on f:pb0vh9. MediaPicker entries/selection rests on f:pyfbqv. The claim inventory marks both ids '[cut] at the pilot draft (brief at fcc83501)', and the dispatch says a cut claim stays off the page, so I did not draft them. The conductor has to re-disposition f:pb0vh9 and f:pyfbqv to carried before a redraft can add them. The outline's covers list and the inventory disagree on these items.
- Structural-edit BLOCKING finding 'Engine building blocks mostly missing' is only partly fixed. The old one-line aside is now a subsection, '### Mount an engine admin component', with a task lead-in, CairnAdminShell's themeOverride (f:qkr057), and a link to the admin components reference. EditPage's spellcheckOverride (f:qmhbgs) and ContentFormFailure (f:qk0l7p) are left out because the inventory marks both ids as cut at the pilot draft. Re-disposition them to carried, and a later redraft can add one sentence each to that subsection.
- Advisory not taken: citing admin-design-system by heading in 'Animate the screen'. That doc lives under docs/internal and is not a published page, so the section cites the cairn-audit reference's static-rules and 'What the motion rules don't cover' anchors in its place.
- Advisory not taken: turning the audit-refusal paragraph into a table. The fact ids carry no response shape for the binding refusal, so a table's Response column would need a claim I can't trace.

Round 2 `frictionFiled`:

- (none)

### theme-your-public-site

Status: escalate (second fix verdict or red gate). Page: `docs/extend/theme-your-public-site.md`.

#### Round-2 blocking findings

Seat: structural edit

````text
- [BLOCKING] docs/extend/theme-your-public-site.md:140: Fails Red Hat 'Information is presented in the most logical order and location' and Google's 'introduces information when it's most relevant to your reader'. 'Chassis conventions' opens 'Every class and layout rule that a port adds follows the chassis's conventions', so it serves only the port. Yet it sits ahead of 'Iterate locally' and 'Re-skin Waymark', so a reader who only re-skins reads port-only rules four sections before the port. The outline's covers list also places conventions and traps after the theme guide and the editor preview.
  rewrite: Move 'Chassis conventions' to sit directly before or after 'Port your own theme onto the chassis' (or make it an H3 under it), and add a port step that points to it, e.g. 'Before you add chrome classes, follow Chassis conventions'. A move is enough: the re-skin path needs none of it.
````

Seat: structural edit

````text
- [BLOCKING] docs/extend/theme-your-public-site.md:307: Fails the task-guide anatomy rule that each explanation section 'opens with a sentence tying it to the task'. It also fails Google's 'brief introduction under each heading to provide some context'. 'Style rendered markdown' opens with a bare statement about prose.css. It never says when a re-skin or a port touches this section, so the page turns from instruction to exposition with no lead-in.
  rewrite: Open the section with a task-tying sentence, e.g. 'A re-skin restyles entry bodies with no edit here, and a port that replaces Waymark's prose styling or renames a directive class edits the files this section names.' Then keep the existing facts.
````

Seat: structural edit

````text
- [BLOCKING] docs/extend/theme-your-public-site.md:15: Fails Google's introduction item 'What the document doesn't cover' and the anatomy's 'names the page to read instead where a reader could be in the wrong place'. The intro routes only two outOfScope items (the scaffold file map and the admin's look). It omits building components (configure-rendering), delivery routes (build-the-public-routes), media storage (configure-media), and configuring cairn-audit for the whole site (run-cairn-audit-on-your-site). A reader who came to build components or set up the audit gate is the one most likely to land here, and that reader learns the right page only from See also at the end.
  rewrite: Extend the routing paragraph (lines 18-20) with one sentence that names the other out-of-scope pages, e.g. 'To build the components a theme styles, see Configure rendering; to run the audit as a site-wide gate, see Run cairn-audit on your site; delivery routes and media storage live in Build the public routes and Configure media.'
````

Seat: register editor

````text
- [BLOCKING] docs/extend/theme-your-public-site.md:30-32 (Before you begin, third item): Base guide, blocking. The list item runs about 30 words, over the 26-word limit for a step or list item. It also breaks the preconditions contract: a precondition is something true before the page starts, yet the item says a section of this page installs it. That is circular for the hand-built reader. The quoted text is "The `daisyui` package installed in the site, which the `theme-contrast` audit rule needs. A scaffolded site already carries it, and [Theme a hand-built site](#theme-a-hand-built-site) installs it in a hand-built one."
  rewrite: Drop the item, because step 1 of Theme a hand-built site installs daisyUI and a scaffolded site already carries it. Move the dependency fact into Verify the theme's lead-in, where the old page had it: "The `theme-contrast` rule reads the site's import chain, so it needs `daisyui` installed in the site." If the item has to stay, shorten it: "- The `daisyui` package, which the `theme-contrast` audit rule reads. A scaffolded site carries it."
````

Seat: register editor

````text
- [BLOCKING] docs/extend/theme-your-public-site.md:399-403 (Verify the theme, step 2 note): Logic and truth, blocking. The new sentence overstates what the rule guarantees: "A clean `theme-contrast` result means every text-bearing pair the theme paints meets the ... AA level of 4.5:1 in each scheme the theme defines." The reference row in docs/reference/cairn-audit.md measures a fixed set of pairs, reads values rather than a rendered page, and reports a value it can't evaluate as unmeasured. Its section "What theme-contrast doesn't cover" lists the gaps. The rework dropped both that qualification and the link to that section. The result is a universal claim ("every ... pair the theme paints") that the reference contradicts. Flag it for the claims checker.
  rewrite: A clean `theme-contrast` result means each pair the rule measures meets the [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/TR/WCAG22/) AA level of 4.5:1 in each scheme the theme defines. The `theme-contrast` row of the [static rules table](../reference/cairn-audit.md#the-static-rules) names the pairs, the color spaces, and the focus-ring threshold. [What theme-contrast doesn't cover](../reference/cairn-audit.md#what-theme-contrast-doesnt-cover) lists the values it reports as unmeasured.
````

#### Round-2 non-blocking findings

- (structural edit) docs/extend/theme-your-public-site.md:3: Non-blocking.
- (structural edit) docs/extend/theme-your-public-site.md:426: Non-blocking.
- (register editor) docs/extend/theme-your-public-site.md:177-178 (Iterate locally, second paragraph): Base guide (sentences in a task section stay under 26 words) plus a dangling purpose clause.
- (register editor) docs/extend/theme-your-public-site.md:3-4 (one-line contract): Logic.
- (register editor) docs/extend/theme-your-public-site.md:426-428 (See also): Register (the task-guide anatomy's see-also section).
- (register editor) docs/extend/theme-your-public-site.md:314-317 (Style rendered markdown, third paragraph): Links (Wikipedia's first-occurrence rule).
- (register editor) docs/extend/theme-your-public-site.md:422-424 (Resolve an audit finding, step 3 note): Base guide (formatting consistency).
- (fact read) docs/extend/theme-your-public-site.md:399-403 (Verify the theme, step 2 note): The rework replaced three sentences: the old color-space and focus-ring sentence and the link to 'What theme-contrast doesn't cover'.
- (fact read) docs/extend/theme-your-public-site.md:28-29 (Before you begin, Tailwind bullet): The prerequisite 'Tailwind CSS in a hand-built site, installed through Tailwind's SvelteKit guide' cites f:f28x0x.

#### Drafter notes

Round 1 gate: pass.

Round 1 `couldNotDo`:

- The relayed user question ('How goes the pass so far? Are the final readers making a useful impact?') is for the conducting session. This drafter saw only one page's rework findings, so it cannot judge the pass or the final readers. All four job-read findings on this page were concrete and actionable, and each is fixed: the introduction, the section order, the thin markdown section, and the formatDate duplicate. The ending was also renamed from Next steps to See also, as the anatomy requires.

Round 1 `frictionFiled`:

- (none)

Round 2 gate: pass.

Round 2 `couldNotDo`:

- Redraft summary for the user's question about the final readers. All four blocking findings are fixed: (1) A new 'Before you begin' section lists four preconditions, each linked to what produces it. They are a scaffolded or hand-built site (linking Add cairn to a SvelteKit app), Tailwind CSS in a hand-built site (vendor link), the daisyui package that theme-contrast needs, and a deployed site with a media library for seeded media (Configure media). The duplicate daisyui sentence in Verify is cut. (2) The intro no longer routes 'the admin's look' to Add a custom admin screen. It now points readers who want to style a custom admin screen at that page's existing '#style-the-screen' section. f:qkr057 (themeOverride) is not among my ids, so I did not draft the admin-theme-pinning claim. (3) The code-highlight sentence now reads that Waymark's theme.css lists the binding in Tier 2, and that the rules for pre.shiki and .cairn-tok-* sit in cairn-public.css and read their colors from the engine's roles (f:kq6ud3, f:c4nnu9). (4) The 'as written' overclaim for hand-built sites is replaced: a role resolves by layer the same way (f:hva8r5), and the preview steps apply with the site's adapter file in place of src/theme/cairn.config.ts (f:spn4hj). The intro routing sentence is split and cites f:iel6v5.
- Advisories taken: the .callout exception now sits in Chassis conventions. The conventions lead-in says 'that a port adds'. The duplicate unlayered-rule sentence in Token tiers is cut. The HMR lead-in now leads with /styleguide. The media-seed paragraph has a task lead-in and the long sentence is split. The 'This guide is for' opener is rewritten. Verify step 2 is trimmed to the pass condition and links the static rules table. The theme-conformance var() sentence moved to the Resolve step it explains. Two over-long source lines are rewrapped. Declined: adding a fourth out-of-scope routing sentence to the intro. It is optional, and the See also section already carries those links. The See also targets configure-rendering, build-the-public-routes, configure-media, run-cairn-audit-on-your-site, debug-your-site, and scaffolded-site-files are still planned pages that do not exist in docs/extend/ yet. Vale reports 0 errors and 3 'admin' warnings, which the register allows. tellgrader reports 0 findings.

Round 2 `frictionFiled`:

- (none)

### architecture

Status: escalate (second fix verdict or red gate). Page: `docs/extend/architecture.md`.

#### Round-2 blocking findings

Seat: register editor

````text
- [BLOCKING] docs/extend/architecture.md:165 (Edit history, changed sentence): Logic, cross-section contradiction. "The save commits stay on the holding branch until a publish deletes it." To make the hand-off, the rework cut the qualification "which the publish deletes when no later save has moved it". The sentence now says every publish deletes the branch. Line 127 says the opposite: the branch survives when a save lands during the publish, and the entry stays pending. A qualified claim lost its qualification, which breaks the 'qualified claims stay whole' rule, and the page now contradicts itself.
  rewrite: The save commits stay on the holding branch until a publish deletes it, under the head check that [Commit concurrency](#commit-concurrency) describes.
````

Seat: register editor

````text
- [BLOCKING] docs/extend/architecture.md:67 (Seams, first list item): This rework finding is still open, and the item is a balanced-halves construction. "In the role vocabulary, a role is a name the site defines, and a capability is one of `none`, `editor`, or `owner`." The two definitions sit side by side, and the sentence never states how they relate. The job read asked for capability to be tied to its seam. The core reference (core.md, around lines 923 to 956) states the tie: the role vocabulary maps each site-defined role name to one of the three capabilities, and the engine resolves `locals.cairnEditor.capability` from that mapping.
  rewrite: - The role vocabulary maps each role name the site defines to one of three capabilities, `none`, `editor`, or `owner`, and the access map gates admin targets by role.
````

Seat: fact read

````text
- [BLOCKING] docs/extend/architecture.md, Edit history, sentence 3 ("The save commits stay on the holding branch until a publish deletes it."), brief cites f:0xxou5: The rework rewrote this sentence, and the new version drops the condition its cited fact carries. f:0xxou5 (content-routes-entry-write.ts:401-405,504-516) says a publish deletes the holding branch only when the branch head still equals the SHA the publish captured. The rewrite also says a publish is the only thing that removes the save commits, which the fact does not support and the code contradicts: discardAction (content-routes-entry-write.ts:532), delete and rename (content-routes-entry-destructive.ts:165,196), and revert (content-routes-entry-revert.ts:167) all delete the branch. The pre-rework sentence was accurate, and a page-level rework should have kept it.
  rewrite: The save commits stay on the holding branch, which a publish deletes when no later save has moved it.
````

#### Round-2 non-blocking findings

- (structural edit) docs/extend/architecture.md:175: Cross-references used appropriately (Block 1): the outline's crossLink architecture -> upgrade-cairn exists for 'what the stability tiers mean for an upgrade', but the Stability tiers section links only the reference index and...
- (structural edit) docs/extend/architecture.md:108: Headings that help users understand the subject (Block 2): the H3 'Branch existence' names the mechanism, not the subject.
- (structural edit) docs/extend/architecture.md:76: Introduce information when it's most relevant (Block 2): the write-path diagram's accTitle and nodes also cover the D1 session lookup and R2 media bytes.
- (structural edit) docs/extend/architecture.md:157: Cross-references (Block 1): the outline entry for sessions, tokens, audit_log, and preview_tokens points their security properties at security-model.
- (structural edit) docs/extend/architecture.md:165: Logical flow and consistency: 'The save commits stay on the holding branch until a publish deletes it' restates the branch lifecycle more absolutely than Commit concurrency (line 127).
- (register editor) docs/extend/architecture.md:53, 55 (Seams table lead-in and column header): Imprecise link description (link-text rule and equivocation).
- (register editor) docs/extend/architecture.md:65 (Seams list lead-in): A grab-bag lead-in with uneven item forms.
- (register editor) docs/extend/architecture.md:5 (introduction, first sentence of the scope paragraph): A figurative spatial claim in a structural position.
- (register editor) docs/extend/architecture.md:14 (paragraph after the out-of-scope list): Placement.
- (register editor) docs/extend/architecture.md:159 (Data tiers, R2 paragraph): Restatement tell.
- (register editor) docs/extend/architecture.md:177 (Stability tiers, new 0.86.0 paragraph): Possible overclaim, for the claims checker.
- (register editor) docs/extend/architecture.md:7-12 and 181-193 (intro scope list and Related resources): Soft overlinking.
- (register editor) docs/extend/architecture.md:5 and 195-200 (prior-knowledge sentence vs. external links): The prior-knowledge sentence names SvelteKit load functions, but the external resources group links routing and form actions only.
- (fact read) docs/extend/architecture.md, Stability tiers, the 0.86.0 paragraph (f:zm9tp4): Every sentence in the rewritten paragraph traces to f:zm9tp4 and to migration-notes.md#0860, and the anchor resolves.
- (fact read) docs/extend/architecture.md, Write path mermaid diagram: The edit from "Publish commit and media manifest row" to two separate edges is now accurate.
- (fact read) docs/extend/architecture.md, outline coverage and absorbed docs/extend/data-tiers.md: Coverage is clean.
- (figure verifier) docs/extend/architecture.md:76: EARNS ITS PLACE.
- (figure verifier) docs/extend/architecture.md:95: Non-blocking accuracy and clarity note.
- (figure verifier) docs/extend/architecture.md:99: Non-blocking text-alternative note.
- (figure verifier) docs/extend/architecture.md:20: Missing-figure test, not failed.

#### Drafter notes

Round 1 gate: pass.

Round 1 `couldNotDo`:

- The cairn-figure skill says to dispatch the figure-verifier agent after a page with a figure is edited. This session has no agent-dispatch tool, so the conductor needs to run it. The write-path and data-tiers mermaid figure, its accTitle and accDescr, and its caption are unchanged from the prior draft.
- The relayed user question ('How goes the pass so far? Are the final readers making a useful impact?') is for the conductor. This drafting seat sees only this one page's rework, so it cannot report on the pass or the final readers.
- This rework was page-level only: structure, introduction, hand-offs, and ending. Pre-existing Vale suggestions (admin, SHA, CMS, passive voice, one 'it is' contraction) were left for the later line-edit read, following the owner ruling that line editing waits for structure. Vale reports 0 errors and 0 warnings.
- The brief keeps one fact id per sentence. The custom-route list item stays as two sentences so that f:03zj56 (route precedence) and f:brfitv (shell children) each keep their own citation.
- The worktree already held uncommitted edits to security-model, add-cairn-to-a-sveltekit-app, replace-magic-links-with-cloudflare-access, their briefs, and the friction log. Those are other tasks' work and this task did not touch them. This task filed no friction entry.

Round 1 `frictionFiled`:

- (none)

Round 2 gate: pass.

Round 2 `couldNotDo`:

- The 0.86.0 worked example is only partly worked, because the dispatch's fact ids do not support the rest. The page now says what changed: the nav fields on AdminShellData and navFilter's parameter and return types, both in the Extension API tier, in a minor version that shipped navLayout (f:zm9tp4). It also says a site that read those fields or declared a navFilter had code to change, and it links migration-notes.md#0860. Three details the structural edit asked for are missing: (1) the field names (customNav, canManageEditors, and navLabel moved to nav, and ResolvedNavItem[] widened to ResolvedLayoutNode[]) need f:bjpv4j, which the dispatch does not list; (2) the CHANGELOG 'Consumers must:' line for 0.86.0 has no fact; (3) no fact says check:surface flagged this break in particular, since f:gknz29 covers only the gate's general detect-and-disclose behavior. Re-run page inputs to add f:bjpv4j (and a changelog fact, if wanted) if the example should name the fields.
- Four of the seams table's new 'Used in' links go to outlined pages that do not exist yet: content-model.md, configure-rendering.md, restrict-admin-access.md, and arrange-the-admin-sidebar.md. check:docs accepts them as pending outline links, but they will not resolve until those pages land.
- I did not take the advisory on the three-places framing. The page keeps the grouping fact f:3rb362 gives (the adapter, the admin mount, and the public routes), because the code backs it, and the SvelteKit layer is still covered in the paragraph that follows the list. The outline's framing should be brought in line with f:3rb362.

Round 2 `frictionFiled`:

- (none)

## Conflicts for the conductor

Scope: every round-2 blocking finding that asks a page to cover something the rework inventory marked `[cut] ... cut at the pilot draft (brief at fcc83501)`. Checked against `docs/internal/outlines/extend.json` (each page's `covers`), the committed brief at `fcc83501` (`git show fcc83501:docs/internal/briefs/extend/<slug>.json`), the fact container, and `docs/reference/admin.md`. The facts are stated plainly; no ruling is made here.

The cut ids per page, as the drafters' inventories listed them (each reads "cut at the pilot draft (brief at fcc83501)"):

- security-model: f:r0cv6e, f:jud805, f:diro7m.
- add-cairn-to-a-sveltekit-app: f:dzmj90, f:pg2smj.
- architecture: f:0435ck, f:2hnxsr, f:5vjwlc, f:pzbmhq, f:xkkt1o.
- add-a-custom-admin-screen: f:22odbz, f:2c19kf, f:2gdaks, f:2gmjvn, f:asujoi, f:bwn0uo, f:pb0vh9, f:pyfbqv, f:qk0l7p, f:qmhbgs, f:x8rhdh, f:xh2mwb.
- theme-your-public-site: f:w6pqic.
- replace-magic-links-with-cloudflare-access: none.

Only add-a-custom-admin-screen has round-2 blocking findings that ask for cut content: two of its five (conflicts 1 and 2). Conflict 3 is adjacent, not a request. No blocking finding on the other five pages asks for the content of a cut id.

### 1. add-a-custom-admin-screen, structural edit, `:212-257`: toolkit props that change behavior

- Finding: add a subsection under "Compose the screen from the toolkit" with one line each for `AdminTable` density and zebra, `EmptyState` headingLevel, `Pagination`'s conditional range line and size select, and `MediaPicker`'s entries and selection, each linked to its admin-toolkit reference anchor. Leave the upload protocol to configure-media.
- Outline covers item cited (covers item 10 of 14): "Toolkit props that change behavior (AdminTable density and zebra, EmptyState headingLevel, Pagination's conditional range line and size select), ExpandableRow's data-cairn-inert-cell, and MediaPicker's entries and selection." The outline's `outOfScope` lists "The media upload protocol (configure-media)", which matches the finding's carve-out.
- Cut facts it needs: f:pb0vh9 (`AdminTable` density and zebra, `EmptyState` headingLevel, `Pagination` range line and size select; source `Pagination.svelte:26-57`, `AdminTable.svelte:44`, `EmptyState.svelte:32`, `[verified]`) and f:pyfbqv (`MediaPicker` entries and `onselect` with `MediaSelection`; `[verified]`). Both are in the outline's `factIds` for the page and both were `[cut]` in the inventory.
- Brief at `fcc83501`: cites neither id, and no sentence mentions density, zebra, headingLevel, `Pagination`, or `MediaPicker`. The current (reworked) brief carries none of them either. The covers item is partly delivered: `ExpandableRow`'s `data-cairn-inert-cell` is on the page (the structural reader cites line 348, and it is not cut).
- Drafter record: the round-2 drafter named this finding in `couldNotDo`, left it unfixed because the inventory marks both ids cut, and wrote "The outline's covers list and the inventory disagree on these items."

### 2. add-a-custom-admin-screen, structural edit, `:255-257`: engine components as building blocks

- Finding: add a sentence each for `EditPage`'s `spellcheckOverride` and for `ContentFormFailure` as the type a content route passes to an engine component's `form` prop, each linked to its `docs/reference/admin.md` entry.
- Outline covers item cited (covers item 11 of 14): "Engine components as building blocks: CairnAdminShell's themeOverride, EditPage's spellcheckOverride, and ContentFormFailure for a content route's form prop."
- Cut facts it needs: f:qmhbgs (`spellcheckOverride` pins spellcheck on or off over the stored preference and hides the toggle; source `EditPage.svelte:104-111,397-402`, `[verified]`) and f:qk0l7p (`ContentFormFailure` is one flat all-optional interface that types a content route's `form` prop; source `content-routes-shared.ts:29-57`, `[verified]`). Both are in the outline's `factIds` and both were `[cut]` in the inventory.
- Brief at `fcc83501`: the mounting aside cites only f:qkr057 (`CairnAdminShell`'s `themeOverride`); neither cut id appears. The page as committed delivers `themeOverride` only, in "### Mount an engine admin component".
- The reviewer's claim that the reference documents both is true: `docs/reference/admin.md` line 252 and 259 (the `EditPage` signature with `spellcheckOverride`), line 266 (`form` carries a `ContentFormFailure`), and line 280 (`spellcheckOverride` is the mounting seam a host outside a real editing session uses to own the spellcheck setting).
- Drafter record: the round-2 `couldNotDo` says it was "only partly fixed" for the same reason and asks the conductor to re-disposition f:qmhbgs and f:qk0l7p to carried.

### 3. add-a-custom-admin-screen, structural edit, `:378-394`: "Animate the screen" (adjacent, not a request for cut content)

- Finding: reduce the section to a citation; the supplied rewrite keeps the reduced-motion sentence, names `static.adminScope`, and links the cairn-audit reference's static-rules, "What the motion rules don't cover", and configuration anchors.
- Outline covers item cited (covers item 9 of 14): "Animate it (section): the motion tokens, the reduced-motion blanket, the three error-tier motion rules and the frame-offset allowance, static.adminScope and cssFiles, citing admin-design-system by heading."
- Cut facts on the same covers item: f:22odbz (`static.cssFiles` and which rules read it), f:2c19kf (the DaisyUI and Tailwind class exemptions of `motion-property` and `motion-vocabulary`), f:2gdaks and f:2gmjvn (the frame-offset allowance). The finding does not ask for any of their content; its rewrite only links to the reference heading that holds the exemptions and frame-offset allowance.
- Brief at `fcc83501`: cites f:2p5otw (reduced-motion opt-back-in), f:t767qb (`static.adminScope` default) and a no-claim link to "What the motion rules don't cover"; none of the four cut ids. The current brief adds f:1x8r1x (the three rules read only components under `static.adminScope` and the `static.cssFiles` entries inside those roots), which is not in the outline's `factIds` for the page.

### Not conflicts, recorded so they are not re-read as cut asks

- add-cairn-to-a-sveltekit-app, fact read, `:3` sentences 1 and 3: re-cite to f:gyu7jc (carried) and f:u705t5. f:u705t5 is a front-door fact (`docs/internal/facts/front-door.md:66`, `[verified]`: `create-cairn-site` scaffolds a complete starter called Waymark); it is not in the page's outline `factIds` and not marked cut or carried in the page inventory. The finding says a cross-arm citation is allowed because the inventory already carries non-outline facts such as f:k16chc.
- add-cairn-to-a-sveltekit-app, structural edit and register editor, "Customize the sign-in email" placement: both ask to move it out of the production milestone to a closing H2. Outline covers for the page lists it as "Customize the sign-in email (a closing section after the milestones, not a milestone)". Not a cut item.
- architecture, register editor and fact read, "Edit history" `:165`: both ask to restore the publish-deletes-branch qualification of f:0xxou5 (carried). Not a cut item.
- replace-magic-links-with-cloudflare-access, round 1 figure verifier (blocking, not blocking in round 2): asked for `/healthz` on the diagram, citing the outline's `figureNote`. The needed fact is f:paotzb (`/healthz` sits outside `/admin`, so the guard does not gate it), which is not in the page's `factIds`; it is not marked cut. The round-2 figure verifier accepted with an advisory that the outline and page disagree on `/healthz`.
