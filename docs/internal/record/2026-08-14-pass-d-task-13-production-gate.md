# Task 13 production gate: findings record (2026-08-14)

This is the archival record of Pass D Task 13, the final adversarial production gate run over
the rebuilt documentation on the `pass-d-phase-3` worktree tree, the exact bytes release one ships.
The gate ran ten lens agents (four claims sweeps, four blind persona walks, one fishtank cross-track
read, one register pass) followed by an independent-verifier stage, all against the governing
methodology at `docs/internal/record/2026-08-14-docs-review-methodology.md` and the audience
profiles at `docs/internal/record/2026-08-14-audience-profiles.md`. Source: the workflow journal at
`wf_76326224-9d5` (34 completed agents). This record is archival only; it fixes nothing. A separate
fold task disposes of each finding.

## Headline: all four blind persona walks failed to reach their goal

Every stage-2 walker was briefed with an audience profile and a concrete goal, told to use only
facts its own track states, and told to record every gap as a guess rather than fill it silently. All
four stopped short of the goal. This is the gate's single most important result, ahead of any finding
count below.

| Track | Persona | Goal | Completed | Stopped at |
| --- | --- | --- | --- | --- |
| `docs/admin` | Technical non-developer running the default site | Create a site, sign in, verify it is healthy, recover an interrupted step | No | `is-it-working.md`, at "Running the check": the walker ran `npx cairn-doctor`, was told the Cloudflare, D1, and GitHub App checks would skip for lack of credentials, and found no page telling a non-developer how to make those checks actually run. |
| `docs/editors` | Non-technical author writing through `/admin` | Write and publish a first entry, add an image, understand a refusal | No | `welcome.md`, "Signing in", step 1: no page in the track states where the sign-in page is or how to find it, so the walker could not open the editor at all. |
| `docs/extend` | Svelte-fluent developer building on cairn seams | Evaluate fit, stand a site up, declare a concept, ship a custom admin screen | No | `add-a-custom-admin-screen.md`, "Gate it": `requireAccess` 403s every session including the owner unless the route is in an access map, and `defineAccess(roles, map)` needs a `roles` declaration no earlier page produces. |
| `docs/reference` | Extender/admin doing a precise API lookup | Answer a precise API question without reading engine source | No | `core.md`'s adapter surface: two of three lookups completed, but the third (which key turns on media, which key enables the nav editor) is unanswerable, with `media`/`assets` and `editor.nav`/`navMenu` naming the same thing two different ways across pages. |

Quoting each walker directly:

- **admin:** "Parts one, two, and four (create the site, get signed in, recover an interrupted step) I would have completed, with the guesses below." The doctor page "never closes the loop" on making the skipped checks run.
- **editors:** "No page in the editors track gives its address, its shape... or any statement that the owner sends it to me... This is the first instruction in the track and it is the one I cannot execute."
- **extend:** "I had a deployed site (build-a-site-by-hand Milestones 1-4) and a second concept declared, but could not complete the gating step... Goal 1 (evaluate whether cairn fits) also had no entry point in this track."
- **reference:** "I completed two of my three lookups... but stopped without an answer on the third: which key a site declares on the adapter to turn on media, and which key enables the built-in nav editor. Neither is answerable from the track without guessing."

## Coverage: the counts, and the gap a silent cap would have hidden

| Lens | Findings |
| --- | --- |
| Claims sweep, `docs/admin` | 13 |
| Claims sweep, `docs/editors` | 10 |
| Claims sweep, `docs/extend` | 18 |
| Claims sweep, `docs/reference` | 13 |
| **Claims sweep subtotal** | **54** |
| Persona walk, `docs/admin` | 6 |
| Persona walk, `docs/editors` | 7 |
| Persona walk, `docs/extend` | 12 |
| Persona walk, `docs/reference` | 8 |
| **Persona walk subtotal** | **33** |
| Fishtank cross-track read | 15 |
| Register pass | 16 |
| **Coherence/register subtotal** | **31** |
| **Total findings, all lenses** | **118** |

**Only 24 of the 118 findings went to independent verification**, because the conductor's
workflow capped the verify stage at 24 (`verifiable.slice(0, 24)`). The cap drew exclusively from the
claims sweeps and, within those, exclusively from `docs/admin` (12 of its 13 findings, all but rank
11), `docs/editors` (all 10), and `docs/extend` (2 of its 18, ranks 1 and 2 only). None of
`docs/reference`'s 13 claims findings, none of the 33 walk findings, and none of the 31
fishtank/register findings were sent to a verifier. **Roughly 94 findings (118 minus 24) remain
unverified.**

Of the 24 verified: **19 CONFIRMED, 3 NARROWED, 2 REFUTED.** That is a 79% (19/24) confirmation
rate on the subset a verifier actually looked at, with a further 12.5% (3/24) landing as real but
narrower than raised, and only 8% (2/24) failing to survive contact with the code. A verification
pipeline's default failure mode is over-firing, and this one still confirmed four in five of what it
checked. Applied to the 94 unverified findings, that rate says the unverified remainder is likely to
carry real, code-confirmed defects rather than noise, not that it can be waved through as
already-checked. The cap was silent in the sense that nothing in the gate's own output flagged it;
this record exists to make it visible before release one cuts.

| Verdict | Count | Share of verified (24) |
| --- | --- | --- |
| CONFIRMED | 19 | 79% |
| NARROWED | 3 | 12.5% |
| REFUTED | 2 | 8% |
| UNVERIFIED | 94 | (not part of the 24) |

Verified findings by source track: `docs/admin` claims 12/13, `docs/editors` claims 10/10,
`docs/extend` claims 2/18, `docs/reference` claims 0/13, all four walks 0/33, fishtank 0/15,
register 0/16.

## Every finding, by lens, as its reviewer ranked it

Each entry carries the page, the quoted line, the criterion (or, for a walk, the fact the
walker had to guess), the proposed change, and its verdict. Where a verifier examined the finding,
the verifier's own evidence and any revised finding are reproduced in full below the entry; those
file-and-line traces are the record's value.

### Stage 1: the claims sweep

### `docs/admin` (13 findings, 12 verified)

13 findings.

**Coverage note (as reported by the sweep):**

```text
Full sweep, not a sample: all 8 pages in docs/admin (README, before-you-start, create-your-site, own-your-domain, is-it-working, setup-recovery, invite-editors, troubleshooting; 889 lines), decomposed to roughly 185 checkable claims and each traced to a source line, a recorded run, or a gated reference page.

What I traced exhaustively rather than by sample: all 21 condition ids and their blocker/warning severities against src/lib/diagnostics/conditions.ts (all 21 present, all severities correct, every anchor slug present) and against the actual check roster in src/lib/doctor/assemble.ts:197-219 (which is where findings 2 and 8 came from); every log event named in troubleshooting.md against src/lib/log/events.ts and its emitting call site (auth.link.requested, auth.token.minted, auth.link.send_failed, guard.rejected + its four reasons, commit.failed, publish.failed + reason=conflict, github.unreachable, auth.role.unknown, media.upload_failed + its six named reasons, admin.action.failed — all correct); every CLI flag in both tools against packages/create-cairn-site/src/args.mjs and src/lib/doctor/bin.ts (--dir, --sign-in, --connect, --start-over, --owner-email, --probe, --send-test, --fix — all real); every quoted UI string and prompt against source (\"Create the GitHub App and repository now?\", \"Install, build, and deploy your site now?\", \"Turn on Cloudflare's Workers Paid plan now...\", \"Sign in there\", \"Add editor\", \"Make owner\"/\"Make editor\", \"Change\", \"Remove\", both LoginPage refusal messages — all match, with two prompts truncated harmlessly); and every number (Node 22 = engines.node \">=22\"; ten minutes = TOKEN_TTL_MS at crypto.ts:59; 30 days = SESSION_TTL_MS at :62; svelte ^5.56.3 = peerDependencies; five and eight token permissions = prefill.mjs:44-79; 3,000 build minutes and one concurrent build = chapter3.mjs:658; $5, $10-15, 48 hours = money.mjs/chapter2.mjs:171 verbatim; one Worker, two databases, one bucket = chapter.mjs:108-111 and emit-template-tree.test.ts:129). All 14 cross-track links resolve to files that exist.

One claim I could not verify against the tree, recorded as such rather than as a finding: the truth of the external platform facts themselves — Cloudflare's $5 Workers Paid price, the $10-$15 registrar range, the 3,000-build-minute free tier, and GitHub's org-owner install approval. Nothing in this repo can settle those. I verified only that each figure matches the tool's own dated, linked copy, that the doc carries the same as-of date the tool does (2026-08-11 for the pricing pair, 2026-08-12 for Workers Builds), and that both dates are three days stale as of this review. Finding 3 turns on a fifth external claim, \"GitHub doesn't allow an App's permissions to be reduced after the fact\", which I likewise could not verify against the tree; I filed it on the dropped-antecedent and dropped-disclosure grounds only, and did not claim the GitHub behavior itself is wrong. Worth one live check before release one if anyone is in a position to make it.
```

#### Rank 1 — `docs/admin/own-your-domain.md` — CONFIRMED

**Quoted:**

```text
The tool restates the price the moment it asks, so you never meet it as a surprise: **Turn on Cloudflare's Workers Paid plan now, so anyone besides you can sign in?** That's $5 US a month, billed once per Cloudflare account rather than once per site
```

**Criterion:**

```text
packages/create-cairn-site/src/cloudflare/catalogue.mjs:556-568 ('paid-plan-missing': "Cloudflare would not onboard your domain for email, because this account is not on the Workers Paid plan... Next: open https://dash.cloudflare.com/?to=/:account/workers-and-pages, turn on the Workers Paid plan, then re-run"). Also the admin profile's counterpart question and docs-register.md:175-176 admin register, "money, prerequisites, and the free-until boundary stated before the step that incurs them."
```

**Proposed change:**

```text
State the prerequisite before the prompt: the tool cannot subscribe you. Answering yes only onboards the sending domain; the Workers Paid subscription itself is a separate click on Cloudflare's dashboard, and a run against an account that is not on Workers Paid stops with a message naming that page. Add a sentence before the prompt quote: "Turn Workers Paid on first, at https://dash.cloudflare.com/?to=/:account/workers-and-pages. Saying yes here does not subscribe you; it tells the tool to go ahead, and if the account is not on the plan yet the run stops and points you at that same page." Then add a matching row to setup-recovery.md's "Connecting your domain" table (**Act**), since that table currently offers only "You declined the Workers Paid prompt, or onboarding is still propagating."
```

**Kind:** procedural

**Verifier evidence:**

```text
Re-derived independently and it holds. (1) The quote is exact and in context: docs/admin/own-your-domain.md:76-88 quotes the prompt verbatim, matching packages/create-cairn-site/src/cloudflare/chapter2.mjs:678-682 byte-for-byte. (2) Decisive empirical check: grep -rn "subscriptions|rate_plan|workers_paid|/billing" over packages/create-cairn-site/**/*.mjs excluding tests returns NOTHING. The only "subscription" hits are api.mjs:71's ENTITLEMENT_PATTERN regex and two comments (args.mjs:31-32, chapter2.test.mjs:461). The tool has no billing call: answering yes runs ensureSendingDomain (chapter2.mjs:697-712) plus a test send, and cannot subscribe anyone. (3) The failure path is real: catalogue.mjs:556-568 defines 'paid-plan-missing' as kind 'act' with Next = "open https://dash.cloudflare.com/?to=/:account/workers-and-pages, turn on the Workers Paid plan, then re-run", thrown from api.mjs:288-291 on an Email Sending refusal matching the entitlement wording. (4) The prerequisite appears nowhere in the admin track: grep "Workers Paid" docs/admin/ returns only before-you-start.md:29 and :53 (price and free-until boundary, and :57 says "Own your domain is where you turn this on", reinforcing the wrong implicature), own-your-domain.md:79, invite-editors.md:7; grep "dash.cloudflare.com|workers-and-pages" docs/admin/ returns zero hits. (5) Register criterion bites: docs/internal/docs-register.md:172-174 requires prerequisites stated before the step that incurs them, and :191 asks "is any step's success dependent on knowledge the page did not state" — here it is. (6) The setup-recovery half also holds: setup-recovery.md:22-24 claims "The tables below cover every point setup can pause at", and the "Connecting your domain" table at :60-67 carries only the decline/propagation row, no paid-plan-missing row. Refutation attempts that failed: the line is not misquoted, the page states nothing false (the defect is omission plus the implicature of quoting a prompt worded "Turn on Cloudflare's Workers Paid plan now"), and no sibling page supplies the missing fact. One caveat on the PROPOSED WORDING only, not the finding: docs/internal/record/2026-08-11-t4b-email-spike.md:139-149 records that the entitlement condition was never reachable on the build account, the mapping keys on wording, and a plan-less account may return 10203 and fall through to the operation row, which prints Cloudflare's own message rather than the dashboard deep link. So "the run stops" is safe to write; "and points you at that same page" is not guaranteed and should be softened.
```


#### Rank 2 — `docs/admin/is-it-working.md` — CONFIRMED

**Quoted:**

```text
Jump to what your doctor named:

- [Force HTTPS at the edge](#force-https-at-the-edge) — `edge.https-not-forced`
- [Admin CSRF token rejected](#admin-csrf-token-rejected) — `auth.csrf-token-invalid`
- [Non-admin origin rejected](#non-admin-origin-rejected) — `auth.csrf-origin-mismatch`
```

**Criterion:**

```text
src/lib/doctor/assemble.ts:197-219 (defaultChecks() lists 19 checks; no check anywhere in src/lib/doctor carries conditionId 'auth.csrf-token-invalid' or 'auth.csrf-origin-mismatch'). Both ids exist only as runtime guard rejections: src/lib/sveltekit/condition-response.ts:12-17 maps them from guard.rejected reasons to a served branded page. The page's own framing at line 24 is "Every failing check names a **condition id**... Find that exact id below", and line 35 is "Jump to what your doctor named".
```

**Proposed change:**

```text
cairn-doctor can never print these two, so an admin sent here by the jump list is chasing a check that does not exist. Keep both headings (check:readiness gates their anchors against the registry) but split the list: keep "Jump to what your doctor named" for the 19 doctor-emitted ids, and add a second short group above it, "Or what your site showed you: an error page naming one of these appears when the admin refuses a request before it reaches the screen", carrying `auth.csrf-token-invalid` and `auth.csrf-origin-mismatch`. In each of the two sections, replace "a blocker" with a line saying where the reader meets it, e.g. "**`auth.csrf-token-invalid`.** Your site serves this as a full-page error rather than the screen you asked for; the doctor does not check it."
```

**Kind:** factual

**Verifier evidence:**

```text
QUOTE VERIFIED. docs/admin/is-it-working.md:34 "Jump to what your doctor named:", :37 "- [Admin CSRF token rejected](#admin-csrf-token-rejected) — `auth.csrf-token-invalid`", :38 "- [Non-admin origin rejected](#non-admin-origin-rejected) — `auth.csrf-origin-mismatch`". Line 23: "Every failing check names a **condition id**, something like `email.sender-not-onboarded`. Find that exact id below". Lines 3-9 tighten the framing further: a doctor check "named a problem by name: this page covers it, below", while a problem "with no doctor check naming it" is routed away to troubleshooting.md. The two sections at :71 and :80 are then written in the identical shape as the real check sections ("**`auth.csrf-token-invalid`, a blocker.**"), beside :60 which says "The check confirms your Cloudflare zone...".

EMPIRICAL CLAIM VERIFIED, and I closed the universe rather than trusting defaultChecks() alone. src/lib/doctor/bin.ts:75-81 assembles the entire run as defaultChecks() plus liveSendCheck (only on --send-test) plus liveProbeCheck (only on --probe); nothing else consumes defaultChecks (grep -rln across src/ and scripts/). src/lib/doctor/assemble.ts:197-219 lists 19 checks. grep for "conditionId" across src/lib/doctor/ returns 21 assignments resolving to 19 unique ids (configMediaBucket at checks-local.ts:35 and configTidyKey at :225 both reuse config.bindings-missing; check-send.ts:24 email.send-failed; check-probe.ts:20 admin.login-probe-failed). Neither auth.csrf-token-invalid nor auth.csrf-origin-mismatch appears anywhere in src/lib/doctor/. docs/reference/doctor.md's check table also contains neither id (grep returns nothing in docs/reference/). The page lists 21 ids under a doctor-only heading; the doctor's unique-id count is 19, and the exact two extras are the pair named.

WHERE THE IDS DO LIVE. src/lib/diagnostics/conditions.ts:44-60 registers both with logEvent 'guard.rejected'. src/lib/sveltekit/condition-response.ts:12-17 maps guard reasons csrf/origin to them; fired at src/lib/sveltekit/guard.ts:105 (origin) and :146 (csrf).

REFUTATION ATTEMPTS, ALL FAILED. (1) Could a bin-appended check emit them? No: only the two factories above, with unrelated ids. (2) Is edge.https-not-forced also wrongly listed, making the grouping arbitrary? No, it is a genuine doctor check (checks-cloudflare.ts:117), so the finding's cut is exactly right. (3) Do the headings belong on the page at all? Yes, and the finding correctly says keep them: scripts/checks/check-readiness.mjs pins every registry docsAnchor to a real heading in this doc with an ALLOWLIST that is now empty, so removing either heading goes RED. (4) Does the page disclaim the mismatch elsewhere? The opposite: its lines 3-9 explicitly promise that a non-doctor problem is not on this page.

READER IMPACT IS REAL. The actual arrival path to these two sections is docs/admin/troubleshooting.md:54-56, linked from the symptom "A form gets refused right when someone tries to use it" and its guard.rejected reason field (:64). A reader who instead runs npx cairn-doctor and scans the jump list is hunting two ids their doctor output can never contain.
```

**Revised finding:**

```text
The defect is confirmed as stated. The finding's PROPOSED REMEDY, however, contains a false claim and must be reworded: it says "an error page naming one of these appears" and "Your site serves this as a full-page error". No served surface names either condition id. csrfRequiredPage() (src/lib/sveltekit/csrf-required-page.ts) is fixed copy with no id; the origin case is not a page at all but a text/plain 403 ("Cross-site POST form submissions are forbidden", src/lib/sveltekit/condition-response.ts:50-55); and the log record carries reason: 'csrf'|'origin' with no conditionId (src/lib/sveltekit/guard.ts:105,146; docs/reference/log-events.md:39 states conditionId rides only on reason: "bindings"). The second group should therefore be keyed to the guard.rejected `reason` field, which is the only place a reader can actually match these two sections, e.g. "Or what your logs named: a guard.rejected record with reason csrf or origin, which your site answers with a refusal instead of the screen." Adjacent, out of the finding's scope but the same defect: docs/admin/troubleshooting.md:53 calls all three of these "the doctor's edge and configuration checks", and two of the three are not doctor checks.
```


#### Rank 3 — `docs/admin/create-your-site.md` — CONFIRMED

**Quoted:**

```text
GitHub doesn't allow an App's permissions to be reduced after the fact, so this stays for as long as the App exists.
```

**Criterion:**

```text
packages/create-cairn-site/src/github/chapter.mjs:31-35, the PERMISSION_COST string the tool prints at this exact prompt: "The App will be able to write this site's content and manage the repository's settings, including deleting it. GitHub does not allow an App's permissions to be reduced later, so this stays for as long as the App exists." The permission is real: manifest.mjs:58-62 requests `administration: 'write'`. The admin profile's anxieties list "is this mine, or am I locked in?" and its counterpart question asks whether any cost or prerequisite is revealed after the step that incurs it; nothing in docs/admin states the App can delete the repository.
```

**Proposed change:**

```text
The doc kept the clause and dropped what it refers to, so "this stays" has no antecedent and the disclosure the tool makes on purpose never reaches a reader who read the docs first. Restore it: "That App is what lets the tool, and your writers, publish to your repository without anyone needing a GitHub account of their own. It can also manage the repository's settings, including deleting it, and GitHub doesn't allow an App's permissions to be reduced after the fact, so that access stays for as long as the App exists. The tool says the same thing before it asks."
```

**Kind:** factual

**Verifier evidence:**

```text
Tried to refute this three ways (misquote, the fact not being real, the disclosure living elsewhere in docs/admin) and it survived all three.

1. QUOTE IS EXACT AND IN CONTEXT. /home/glw907/Projects/cairn-cms/.claude/worktrees/pass-d-phase-3/docs/admin/create-your-site.md:30-34 reads: "The tool explains what it's about to do, then asks: **Create the GitHub App and repository now?** Say yes, and it creates a private GitHub repository for your content, and a GitHub App that exists only for this site. That App is what lets the tool, and your writers, publish to your repository without anyone needing a GitHub account of their own. GitHub doesn't allow an App's permissions to be reduced after the fact, so this stays for as long as the App exists." The quoted line is verbatim at line 33-34.

2. THE OMITTED FACT IS REAL, VERIFIED IN SOURCE. packages/create-cairn-site/src/github/manifest.mjs:57-61 builds `default_permissions: { contents: 'write', administration: 'write', ...(ownerType === 'org' ? { members: 'read' } : {}) }`. GitHub's Administration:write is repo-settings-and-deletion. So the capability the doc omits is genuinely requested, not speculative.

3. THE TOOL DISCLOSES IT AT THIS EXACT PROMPT. packages/create-cairn-site/src/github/chapter.mjs:31-35 defines PERMISSION_COST = "The App will be able to write this site's content and manage the repository's settings, including deleting it. GitHub does not allow an App's permissions to be reduced later, so this stays for as long as the App exists. This is what lets the tool create and publish to the repository for you." chapter.mjs:209-211 interpolates it into `consentDetail`; :214-215 logs consentDetail; :228 then calls `confirm({ message: 'Create the GitHub App and repository now?' })` — the same prompt string the doc quotes at line 30. So the doc paraphrases the tool's disclosure paragraph, keeps its second sentence and its fourth, and drops the first sentence, which is the one carrying the cost.

4. THE DISCLOSURE APPEARS NOWHERE ELSE IN THE PUBLISHED DOCS. `grep -rniE "administration|delete the repo|deleting it|permissions to be reduced|reduced later" docs/ --include=*.md` returns hits only in docs/superpowers/ (internal specs and plans) and the one create-your-site.md:34 line. docs/admin/before-you-start.md's only App mentions are line 12 ("A GitHub App, created just for this site, that commits and publishes on your writers' behalf") and lines 63-64 (key rotation) — neither states the repo-deletion power. Grepping docs/admin, docs/editors, docs/README.md, docs/why-cairn.md for delete/settings language returns only editor-facing image and entry deletion.

5. THE DESIGN SPEC MAKES THIS A REQUIREMENT, NOT A STYLE PREFERENCE. docs/superpowers/specs/2026-08-10-create-cairn-site-t2-design.md:96-99: "The fold adds two conditions. **The consent prompt itself states the cost plainly** — that the App can also delete the repository, and that GitHub does not allow an App's permissions to be reduced later — not only the README (the admin decides at the prompt, not in a file they will never open)." The reasoning is that the admin decides at the decision point; the docs page is the admin's other decision point (line 19-20 tells them the tool prints the cost picture "first ... the same facts as Before you start", which is now false for this fact).

6. THE PROPOSED CHANGE MAKES THE PAGE MORE TRUE, NOT MERELY TIDIER. It adds a source-backed capability the page currently omits, and its closing sentence ("The tool says the same thing before it asks") is verified true by chapter.mjs:211/215/228 ordering. It trades nothing accurate away.

Grading criterion checks out: audience-profiles.md:99-100 lists the admin anxiety "is this mine, or am I locked in?", and :109-110 makes the counterpart question "is any cost or prerequisite revealed after the step that incurs it" — which is exactly what happens here, since the reader who prepares from the docs meets the deletion power only in the terminal.

One small over-claim in the finding's framing, which does not change the verdict: "this stays" is not strictly antecedent-less. It can be read as resolving to the publish access described in the preceding sentence. The defect is not a broken pronoun; it is that the retained clause is the mitigation half of a two-part disclosure whose costly half was dropped, so the sentence reads as a reassurance about publishing rather than a warning about deletion.
```

**Revised finding:**

```text
The finding stands as raised. If the "no antecedent" phrasing is load-bearing for triage, restate the defect as: docs/admin/create-your-site.md:31-34 reproduces the tool's PERMISSION_COST disclosure minus its first sentence, dropping the only statement in all of docs/admin that the App can manage repository settings including deleting the repo (manifest.mjs:59, `administration: 'write'`), while keeping the irreversibility clause that exists to qualify it.
```


#### Rank 4 — `docs/admin/own-your-domain.md` — CONFIRMED

**Quoted:**

```text
That record stays in place even if you turn Email Sending off again later, so if you add a newsletter tool or a mailing list to this domain afterward, add it to that DMARC record too, or its mail gets rejected.
```

**Criterion:**

```text
docs/internal/record/2026-08-11-t4b-email-spike.md:111 records the record Cloudflare writes as TXT `"v=DMARC1; p=reject;"` at `_dmarc.<apex>`, and :134-136 states the consequence as "A `p=reject` DMARC record with no matching sender rejects mail from anything else they later add." A DMARC record carries a policy, not a sender list; there is nothing in it to add a sender to. The matching-sender fix is the domain's SPF record or the new tool's DKIM key, neither of which this page names.
```

**Proposed change:**

```text
The instruction reads correctly and cannot be carried out. Replace with what the spike record actually establishes: "That record stays in place even if you turn Email Sending off again later. It tells receivers to reject any mail claiming to be from your domain that your domain hasn't vouched for. So if you add a newsletter tool or a mailing list to this domain afterward, follow that tool's own instructions for adding itself to your domain's mail records before you send anything through it, or its mail gets rejected. Nothing about that lives in the record Cloudflare wrote; that one only sets the policy."
```

**Kind:** procedural

**Verifier evidence:**

```text
I tried to refute this and could not.

**1. The quote is exact and in context.** `docs/admin/own-your-domain.md:95-98` reads verbatim: "Onboarding also writes a DMARC policy at `_dmarc.yourdomain`, set to reject mail that isn't from Cloudflare's own sending infrastructure. That record stays in place even if you turn Email Sending off again later, so if you add a newsletter tool or a mailing list to this domain afterward, **add it to that DMARC record too**, or its mail gets rejected." No surrounding sentence qualifies it. This is the page's closing paragraph before the "You know it worked when" heading, so it is the last instruction the admin carries away.

**2. The empirical check kills the instruction.** `docs/internal/record/2026-08-11-t4b-email-spike.md:111` quotes the record Cloudflare actually wrote, in full: TXT `"v=DMARC1; p=reject;"` at `_dmarc.carin-test.org`. That is the entire content — two tags, `v` and `p`. There is no field in it, and RFC 7489 defines no DMARC tag, that names or authorizes a sender; the tags are policy, alignment, reporting, and sampling. The instruction "add it to that DMARC record" names a target that does not exist, so an admin who follows the page has nowhere to type. Per the admin profile (`docs/internal/record/2026-08-14-audience-profiles.md:78-79`), this reader "cannot derive an unstated step" — the exact failure mode.

**3. The same spike record names the real mechanism, and the page omits it.** The spike's own table at :111-116 shows the sender identity lives in the records this page never mentions: TXT `"v=spf1 include:_spf.mx.cloudflare.net ~all"` at `cf-bounce.<domain>` and a DKIM TXT at `cf-bounce._domainkey.<domain>`. And :134-136 phrases the consequence as "A `p=reject` DMARC record with **no matching sender**" — sender matching being an SPF/DKIM property, not a DMARC one. I grepped the whole published tree (`grep -rn "DMARC\|SPF\|DKIM" docs/ --include=*.md | grep -v internal/`): the only two hits in all four audience tracks are lines 95 and 98 of this page. SPF and DKIM appear nowhere a reader could act on them.

**4. Sentence one seeds the wrong model that makes sentence two look sensible.** "set to reject mail that isn't from Cloudflare's own sending infrastructure" implies the record enumerates an allowed sender. It does not; `p=reject` tells receivers to reject mail from the domain that fails authentication, with no reference to Cloudflare anywhere in the record. Notably `packages/create-cairn-site/README.md:253-254` says it correctly — "asks receivers to reject mail from your domain that does not pass authentication" — so the docs page is a degradation of wording the repo already got right elsewhere.

**5. The proposed change makes the page more true, not merely tidier.** It preserves both facts the spike establishes (the record survives turning Email Sending off; a later sender gets rejected) and replaces an unexecutable step with one the admin can actually perform — follow the new tool's own instructions for adding itself to the domain's mail records. Nothing accurate is traded away.

**Scope note beyond the finding (not a narrowing):** the identical defect ships in two places outside the docs tree under review, and a test currently locks it in. `packages/create-cairn-site/src/cloudflare/chapter2.mjs:801-804` prints "add it to that record too" to the admin's terminal at the end of a real run, and `packages/create-cairn-site/README.md:253-255` repeats it. `chapter2.test.mjs:1830-1857` asserts the closing copy matches `/_dmarc\./`, `/reject/i`, and `/newsletter/`, all of which the corrected wording still satisfies, so a fix to the CLI copy will not break the gate. The docs page is a faithful mirror of the CLI string, which is why it reads plausibly; the origin is upstream of the docs rebuild.
```

**Revised finding:**

```text
Confirmed as raised. The one addition worth carrying forward: the error is not docs-only. It originates in the CLI's own closing copy at packages/create-cairn-site/src/cloudflare/chapter2.mjs:801-804 and is repeated at packages/create-cairn-site/README.md:253-255, so fixing only docs/admin/own-your-domain.md:95-98 leaves the admin's terminal printing the same unexecutable instruction. The existing assertions in chapter2.test.mjs:1830-1857 do not block the correction. Secondary, in the same paragraph: "set to reject mail that isn't from Cloudflare's own sending infrastructure" (line 95) is itself inaccurate and is what makes the bad instruction on line 98 read as coherent; the README's "does not pass authentication" is the accurate phrasing already in the repo.
```


#### Rank 5 — `docs/admin/is-it-working.md` — CONFIRMED

**Quoted:**

```text
**A gap worth knowing about:** a site scaffolded with a current SvelteKit toolchain carries no `svelte.config.js` file at all; that wiring now lives inside `vite.config.ts` instead. On a site shaped that way, this check finds no file to read and reports a skip, not a pass
```

**Criterion:**

```text
A create-cairn-site site is not shaped that way. scripts/build/emit-template.mjs:143 emits the template from examples/showcase; examples/showcase/.cairn-template.json's exclude list does not name `svelte.config.js`, so it is copied; examples/showcase/svelte.config.js:43 carries `csrf: { checkOrigin: false }`. src/lib/doctor/checks-local.ts:90-91 skips only when `readFile('svelte.config.js')` returns null. The admin profile's arrival state (audience-profiles.md:82-85) is that `create-cairn-site` is the setup spine, so this is the only site shape this track's reader has.
```

**Proposed change:**

```text
As written, an admin whose check reports pass or fail is told to distrust it and go read a developer page about a file layout their site does not use. Scope the paragraph: "**One case where a skip is not a pass.** If your site was built by hand rather than by `create-cairn-site`, it may carry no `svelte.config.js` at all, and this check reports a skip because there was no file to read. A site `create-cairn-site` made always has that file, so on your site this check really does run. If yours skips here anyway, that's worth asking a developer about; send them [Build a site by hand](../extend/build-a-site-by-hand.md)."
```

**Kind:** factual

**Verifier evidence:**

```text
Ran the pipeline rather than reasoning about it. (1) `node scripts/build/emit-template.mjs /tmp/verif-tmpl "^0.94.0" "^0.94.0"` emits a tree whose root contains `svelte.config.js`; `examples/showcase/.cairn-template.json`'s exclude list (9 entries) does not name it, and `scripts/build/emit-template.mjs:111` alwaysSkip does not either. (2) `/tmp/verif-tmpl/svelte.config.js:43` carries an uncommented `csrf: { checkOrigin: false }`; `/tmp/verif-tmpl/src/hooks.server.ts:1` imports `createAuthGuard` from `@glw907/cairn-cms/sveltekit`. (3) I executed the compiled check itself — `configCsrfDisable.run` from `dist/doctor/checks-local.js`, with a cwd-relative readFile matching `src/lib/doctor/bin.ts:51-53` — against that emitted tree, and it returned `{"status":"pass","detail":"checkOrigin: false found and the hooks file wires the cairn guard (heuristic text read)"}`. Pass, not skip. `src/lib/doctor/checks-local.ts:90-91` skips only on a null read of `svelte.config.js`, which does not occur here. (4) Both creation doors reach that tree: `packages/create-cairn-site/scripts/bake-template.mjs:183-188` calls emitTemplate from `examples/showcase`, and `.github/workflows/create-site.yml:49` bakes through the same script. The quoted line exists verbatim at `docs/admin/is-it-working.md:138-146` and says what the finding claims. Beyond the finding as raised, I verified the misdirection is concrete: `grep -n "csrf|checkOrigin|sveltekit(" /tmp/verif-tmpl/vite.config.ts` returns only `37: sveltekit(),`, so the page's instruction to "confirm it by reading your own vite.config.ts" sends a create-cairn-site admin to the one file that provably lacks the wiring, where finding nothing reads as evidence of breakage. The page also contradicts itself: line 31 already fixes the reader's site shape as "a site set up through create-cairn-site". Register support: `docs/internal/record/2026-08-14-audience-profiles.md:82-85` makes create-cairn-site the admin's setup spine and :78-79 states this reader cannot derive an unstated step, while the current text asks them to read and adjudicate two config files. The proposed change scopes rather than deletes, and the narrow true case survives it: the profile's arrival state also covers an inherited site, and `docs/extend/build-a-site-by-hand.md:30` and :599-604 establish that the hand-built scaffold really does carry no svelte.config.js and really does skip. The finding's citations (checks-local.ts:90-91, showcase svelte.config.js:43) are exact.
```


#### Rank 6 — `docs/admin/troubleshooting.md` — CONFIRMED

**Quoted:**

```text
Separately, if the **Publish site** button that shows a count of unpublished entries has simply disappeared, that isn't a failed publish: it means the site couldn't read GitHub at all to know what's pending, and it hides the button rather than guess at a count.
```

**Criterion:**

```text
src/lib/components/CairnAdminShell.svelte:644-645: `{#await data.pendingEntries then pending}{#if pending && pending.length > 0}`. The button is hidden on `null` (the github.unreachable case, content-routes-core.ts:583-585) and equally on an empty list, which is the ordinary state of a site with nothing waiting to publish. src/lib/sveltekit/content-routes-core.ts:567-569 also returns an empty list for a none-capability session.
```

**Proposed change:**

```text
The common reason is stated as the rare one, which sends an admin hunting a GitHub App fault on a healthy site. Rewrite: "Separately, the **Publish site** button only appears when something is actually waiting to publish, so its absence usually just means nothing is pending. If you know an editor has saved work that hasn't gone live and the button still isn't there, that's the other case: the site couldn't read GitHub at all to know what's pending, and it hides the button rather than guess at a count. Check the GitHub App the same way."
```

**Kind:** factual

**Verifier evidence:**

```text
Quote verified verbatim at docs/admin/troubleshooting.md:77-80, in the section "A save or publish reports a conflict, or just fails"; the same over-broad claim repeats in the log line at :82-84 ("The Publish site button disappearing is `github.unreachable`").

Code re-derived independently:
- src/lib/components/CairnAdminShell.svelte:644-645 (`{#await data.pendingEntries then pending}` / `{#if pending && pending.length > 0}`), mirrored at :731-732. Absence is indistinguishable across every hiding cause.
- src/lib/sveltekit/content-routes-core.ts:576-582 resolves a real filtered list that is EMPTY whenever nothing is pending — the ordinary state, and precisely the state produced by a SUCCESSFUL "Publish site". So "the button has simply disappeared" most often means the publish worked.
- src/lib/sveltekit/content-routes-core.ts:583-586 is the only case the doc describes: `log.warn('github.unreachable', { scope: 'shell', error: String(err) }); return null;`.
- src/lib/sveltekit/content-routes-core.ts:568-570 short-circuits a none-capability session to `Promise.resolve([])`, hiding the button with no backend read at all.
- A fourth cause the original finding missed: CairnAdminShell.svelte:622-627, the `{#if isDeskRoute}` branch, whose own comment states "the palette trigger and the site-wide Publish button stand down so the band has one job here." Opening any entry hides the button.

No rescue elsewhere in the audience track: `grep -rn "pending|unpublished" docs/admin/` returns only troubleshooting.md:77 and :79. The "appears only when entries are pending" fact is stated only in the editor track (docs/editors/publish-and-history.md:65), a different audience.

Confirming instruments the page can point at exist and are correctly wired: docs/reference/log-events.md:38 documents `github.unreachable` with `scope: 'shell'`, and src/lib/diagnostics/conditions.ts:179-186 maps the doctor's `github.app-unreachable` blocker to that event. The proposed rewrite is more true because it conditions the unreachable reading on the one discriminator an admin has from the UI ("an editor saved work that hasn't gone live"), rather than asserting a single cause for a four-cause symptom.
```

**Revised finding:**

```text
The finding holds and is slightly broader than raised: besides the empty-list and none-capability cases the reviewer named, the button also stands down on any desk (open-entry) route per CairnAdminShell.svelte:622-627. The fix should condition BOTH the prose at troubleshooting.md:77-80 and the log line at :82-84, and ideally note that the button is not shown while an entry is open. Severity is modest (wrong-cause chase on a healthy site), matching its rank-6 placement.
```


#### Rank 7 — `docs/admin/is-it-working.md` — CONFIRMED

**Quoted:**

```text
The GitHub App, Cloudflare, and D1 checks all need a value like your Cloudflare API token or your GitHub App's private key, and on a site set up through `create-cairn-site`, those live in your deployed Worker's secrets, not in your own terminal.
```

**Criterion:**

```text
src/lib/doctor/assemble.ts:104 reads the token from `env.CLOUDFLARE_API_TOKEN` and assemble.ts:145-146 states "The API token is never derived; it stays env-only"; src/lib/doctor/cloudflare-api.ts:10 skips with "set CLOUDFLARE_API_TOKEN to run this check". No engine code under src/lib outside the doctor reads CLOUDFLARE_API_TOKEN, and packages/create-cairn-site/src/cloudflare/secret.mjs:32 pushes exactly one Worker secret, `GITHUB_APP_PRIVATE_KEY_B64`. The Cloudflare token lives in the tool's own progress record (state.mjs:26, `~/.config/cairn/sites`) and is deleted at the chapter's terminal steps.
```

**Proposed change:**

```text
Only the GitHub App key half is true, so an admin who goes looking in the Worker's secrets for their Cloudflare token finds nothing. Correct it: "...those checks need a value your terminal doesn't have: your GitHub App's private key, which setup moved into your deployed Worker, or a Cloudflare API token, which the tool holds only while it's running and then deletes. A skip there isn't a pass; it's the check telling you it had nothing to check, and getting it to run is a developer's job."
```

**Kind:** factual

**Verifier evidence:**

```text
QUOTE CHECK. The line exists verbatim at docs/admin/is-it-working.md:28-32, inside the "A skip is neither" paragraph, and says what the finding claims: "The GitHub App, Cloudflare, and D1 checks all need a value like your Cloudflare API token or your GitHub App's private key, and on a site set up through `create-cairn-site`, those live in your deployed Worker's secrets, not in your own terminal." Not misquoted, not out of context.

FIRST HALF IS TRUE (so the finding is correctly scoped to the second half). src/lib/doctor/checks-cloudflare.ts:87,120,151 gate the email/zone checks on `if (!ctx.cfToken) return NO_TOKEN`; :214, :262, :288 gate the three D1 checks (`authStore`, `roleVocabulary`, `emailNormalization`) on `if (!ctx.cfToken || !ctx.cfAccountId) return NO_ACCOUNT`; check-send.ts:27 the same. src/lib/doctor/assemble.ts:84-115 assembles `github` only when the whole `GITHUB_APP_ID`/`GITHUB_APP_INSTALLATION_ID`/`GITHUB_APP_PRIVATE_KEY_B64` trio is present. So those three check families genuinely do need the token or the key.

SECOND HALF IS FALSE FOR THE CLOUDFLARE TOKEN. (a) assemble.ts:104 `cfToken: env.CLOUDFLARE_API_TOKEN`, and the doc block at assemble.ts:145-146 states "The API token is never derived; it stays env-only." (b) cloudflare-api.ts:10 `NO_TOKEN = skip('set CLOUDFLARE_API_TOKEN to run this check')`, :17 the NO_ACCOUNT variant. (c) `grep -rn CLOUDFLARE_API_TOKEN src/ packages/` returns only src/lib/doctor/{assemble.ts,types.ts:61,cloudflare-api.ts}, the doctor tests, and one comment at packages/create-cairn-site/src/cloudflare/deploy.mjs:45 about wrangler honoring the ambient env var. No engine code and no Worker code consumes it. (d) `grep -rn "secret', 'put'"` across packages/create-cairn-site/src returns exactly one production call site, secret.mjs:32 `runWrangler(['secret', 'put', 'GITHUB_APP_PRIVATE_KEY_B64'])`, and secret.mjs:1-4 and :10-13 confirm that is the only key moved. So the deployed Worker's secret store contains the App PEM and not the Cloudflare token.

WHERE THE TOKEN ACTUALLY LIVES. packages/create-cairn-site/src/state.mjs:26-27 `siteStateDir()` returns `~/.config/cairn/sites`; the `saveSite` doc block at state.mjs:44-49 names "the Cloudflare chapter dropping a saved API token at completion" as its motivating case. chapter2.mjs:141-142 and :423-424 write and later strip `cloudflare.apiToken`; chapter3.mjs:17-27 carries the TOKEN LIFECYCLE comment ending "The token is deleted at every terminal outcome (builds-live, ...)", with the save at chapter3.mjs:825-828. An admin on a finished site has no Cloudflare token anywhere reachable, and looking in `wrangler secret list` for it finds only GITHUB_APP_PRIVATE_KEY_B64.

THE PAGE IS THE OUTLIER, NOT THE CORPUS. docs/reference/doctor.md:46 "Env-only; never derived" and :67 "Secrets (`CLOUDFLARE_API_TOKEN` and the GitHub App credential trio) come only from the environment." docs/admin/create-your-site.md:57-59 correctly limits the Worker-secret move to "your GitHub App's private key." Two sibling pages state it precisely; is-it-working.md over-generalizes.

WOULD THE CHANGE MAKE THE PAGE MORE TRUE? Yes on the substance, with one wording caveat the editor should fold rather than paste. The proposed "which the tool holds only while it's running and then deletes" is loose: the token persists on disk in `~/.config/cairn/sites/<id>.json` across a parked run and is deleted at terminal outcomes (chapter3.mjs:17-27), not at process exit. And the appended "getting it to run is a developer's job" is a new editorial claim the source does not establish; an admin with the variable in their own shell can run the checks. The defect is real; the replacement sentence needs those two tweaks.

SEVERITY. Consistent with the raiser's own rank 7. The operative clause, "not in your own terminal," is true of both values, and the page asks for no retrieval action, so the error misdirects a curious admin rather than breaking an instruction.
```

**Revised finding:**

```text
The factual defect is confirmed as raised: the Cloudflare API token is never a Worker secret, so "those live in your deployed Worker's secrets" is true only of the GitHub App private key. The proposed replacement text needs two corrections before it lands: the token is persisted to `~/.config/cairn/sites/<id>.json` and deleted at the setup chapter's terminal outcomes, not merely "held while it's running", and the added clause "getting it to run is a developer's job" asserts something the code does not support (an admin who sets CLOUDFLARE_API_TOKEN in their own shell runs the checks fine).
```


#### Rank 8 — `docs/admin/is-it-working.md` — CONFIRMED

**Quoted:**

```text
**`email.send-failed`, also a blocker.** The sending domain is onboarded, but a real send attempt failed for some other reason: a delivery error, a misconfigured binding, or a problem with the sender address itself.
```

**Criterion:**

```text
src/lib/doctor/assemble.ts:197-219: defaultChecks() does not include liveSendCheck. src/lib/doctor/bin.ts:76 adds it only on `--send-test`: `if (args.sendTest) checks.push(liveSendCheck(args.sendTest))`. The page states the opt-in rule for the one other conditional check ("This check only runs when you pass `--probe`", line 271) but not for this one.
```

**Proposed change:**

```text
Add the same disclosure the probe section carries, so a bare run's silence on sending isn't read as a pass: after the Act paragraph, add "This check only runs when you pass `--send-test <address>`; a bare `npx cairn-doctor` never tries a real send. Running it is the fastest way to prove sending works without waiting on a real editor to try." That also lets you drop the duplicate `--send-test` sentence currently sitting at the end of [Probe the deployed admin](#probe-the-deployed-admin), where it has nothing to do with the probe.
```

**Kind:** factual

**Verifier evidence:**

```text
Quote verified verbatim at docs/admin/is-it-working.md:99-101.

Empirical core independently re-derived:
- src/lib/doctor/check-send.ts:24 is the ONLY occurrence of conditionId 'email.send-failed' in src/lib/doctor/ (grep across the dir returns one hit). It sits on liveSendCheck, a factory, not a check constant.
- src/lib/doctor/assemble.ts:194-219: defaultChecks() returns 19 checks and liveSendCheck is not among them. Its own doc comment at assemble.ts:191-193 says so explicitly: "The live send is opt-in (--send-test) and never sits here; the bin appends it."
- src/lib/doctor/bin.ts:76: `if (args.sendTest) checks.push(liveSendCheck(args.sendTest));`
- src/lib/doctor/assemble.ts:54: `'--send-test': 'sendTest'`.
So `email.send-failed` is unreachable from a bare `npx cairn-doctor`, exactly as claimed.

Page asymmetry is real. docs/admin/is-it-working.md:271 carries the disclosure for the structurally identical other opt-in check: "This check only runs when you pass `--probe`; a bare `npx cairn-doctor` never makes this request on its own." The email.send-failed section (lines 99-106) carries no equivalent, and the jump list at lines 41-42 indexes `email.send-failed` alongside 18 default-registry ids with nothing marking it conditional.

Misplacement is real. Lines 272-274 put the `--send-test` sentence at the tail of "## Probe the deployed admin", a section indexed to `admin.login-probe-failed`; it is topically unrelated to the probe.

Refutations attempted and failed:
1. "Lookup-by-id page, so the reader already ran --send-test" would equally excuse the --probe disclosure the page chose to carry at :271. It also cuts against the page's own skip paragraph (:29-33), which trains the reader that an unrun check is not a pass; a bare run produces not even a skip line for the live send.
2. "The reference covers it": docs/reference/doctor.md:99 ("Runs only with `--send-test`"), :72 and :117 do state the rule, but the admin track serves the non-developer operator and the page already declines to defer for --probe.

Adjacent supporting evidence that this section is under-anchored (not a separate ask): line 100 lists "a misconfigured binding" as a cause, but check-send.ts:1-3 and :30 show the doctor's live send uses cfPost against /accounts/{id}/email/sending/send precisely because "the Worker EMAIL binding is unreachable from a CLI." The doctor's send never touches the EMAIL binding; the section drifts into runtime-log territory because it never states what the check itself does.

The proposed change adds a statement true of bin.ts:76 and relocates a misfiled sentence. It trades away no accurate statement.
```

**Revised finding:**

```text
One precision on the finding's wording: the page is not silent about `--send-test`. It mentions the flag at lines 272-274, but under the wrong heading and framed as a suggestion ("the fastest way to prove sending actually works") rather than as the opt-in rule for `email.send-failed`. The defect is the missing opt-in disclosure in the email.send-failed section at lines 99-106 plus the misfiled sentence, not total absence of the flag from the page.
```


#### Rank 9 — `docs/admin/is-it-working.md` — CONFIRMED

**Quoted:**

```text
**Act:** re-run `npx create-cairn-site --dir <your-site-directory>`. It creates the database, applies every migration in order, and writes your owner row.
```

**Criterion:**

```text
packages/create-cairn-site/bin.mjs:493-514: a record at step `live` prints "is already live" and goes to `continueIntoChapter2`, the domain admission. The migrations hop is chapter 1's (packages/create-cairn-site/src/cloudflare/chapter.mjs:227-232), which a plain re-run only reaches from RESUMABLE_STEPS, i.e. a site that never finished going live. A site that can fail `auth.store-unreachable` is by definition already deployed.
```

**Proposed change:**

```text
On the site this condition actually fires on, the re-run does not do any of the three things this sentence promises; it opens the domain questions instead. Reframe as the confirmation the following sentence already hints at: "**Act:** if your site never finished going live, re-run `npx create-cairn-site --dir <your-site-directory>`; it picks up where it stopped, and creating the database, applying its migrations, and writing your owner row are all part of that. If your site is already live, re-running won't redo any of that, and this check failing means something changed afterward: that's a developer's job. Send them [Add cairn to a SvelteKit app](../extend/add-cairn-to-a-sveltekit-app.md)."
```

**Kind:** procedural

**Verifier evidence:**

```text
1. Quote verified verbatim in docs/admin/is-it-working.md, section "Provision the auth store", under `auth.store-unreachable`: "**Act:** re-run `npx create-cairn-site --dir <your-site-directory>`. It creates the database, applies every migration in order, and writes your owner row."

2. packages/create-cairn-site/bin.mjs:493-514 — `if (priorRecord && priorRecord.data.step === 'live')` prints "`${priorRecord.data.name} is already live.`" then, absent `flags.signIn`, calls `continueIntoChapter2({...})` and returns. Chapter 2 is the domain admission.

3. All three promised effects traced to their only call sites, none reachable from `live`:
   - Database creation: wrangler auto-provisions during `deployWorker`, which sits inside `if (!resumingAtDeployed)` at packages/create-cairn-site/src/cloudflare/chapter.mjs:221-243 (deploy.mjs:6 comment: "wrangler auto-provisions").
   - Migrations: `grep -rn applyMigrations` over packages/create-cairn-site/src gives exactly one non-test call site, chapter.mjs:232, inside that same `!resumingAtDeployed` block. So even a `deployed`-step resume skips migrations.
   - Owner row: `seedOwnerAndToken` called at chapter.mjs:260 and bin.mjs:305 (`reseedAndOpen`); all four `reseedAndOpen` call sites (bin.mjs:456, 500, 541, 570) are gated on `flags.signIn`.

4. `grep -rn "applyMigrations|seedOwner|d1|AUTH_DB" packages/create-cairn-site/src/cloudflare/chapter2.mjs` returns no matches: chapter 2 never touches the auth store.

5. The scope widening: src/lib/doctor/checks-cloudflare.ts:216 — `if (typeof facts?.authDbId !== 'string') return skip('no AUTH_DB database_id in wrangler.jsonc or wrangler.toml')`. src/lib/doctor/wrangler-config.ts:191 sets `facts.authDbId` only from `authDb?.database_id` (TOML equivalent at :217); there is no resolve-by-binding-name fallback. packages/create-cairn-site/src/cloudflare/config.mjs:84-86 documents the scaffold dropping "both showcase placeholder `database_id` lines whole (id-less bindings resolve by name; wrangler provisions and binds them without ever writing an id back into this file)", and :111-118 performs the removal (`[`      ${PLACEHOLDER_AUTH_DATABASE_ID},
`, '']`).

6. Nuance for any rewrite: packages/create-cairn-site/src/cloudflare/bootstrap.mjs:103-105 guards the owner insert with `WHERE NOT EXISTS (SELECT 1 FROM editor)`, so "writes your owner row" is conditional on an empty allowlist even where the seed does run.
```

**Revised finding:**

```text
Confirmed as raised, and the true scope is wider than claimed. The finding says the Act line misfires on already-live sites; the check's own skip guard shows it misfires on every create-cairn-site site. `authStore` (src/lib/doctor/checks-cloudflare.ts:209-222) can only FAIL when wrangler config carries an explicit AUTH_DB `database_id`, and `nameWranglerResources` (packages/create-cairn-site/src/cloudflare/config.mjs:84-86, 111-118) strips exactly that line from every scaffold, so on a tool-built site the check skips rather than fails. The population that can actually see `auth.store-unreachable` is a hand-wired site, where `npx create-cairn-site` is the wrong tool outright: with no state record the re-run falls through to `collectAnswers()`/`scaffold()` (bin.mjs, past the resume cascade ending at :581+). The fix should therefore not merely add an "if your site never finished going live" qualifier; it should stop presenting the re-run as this condition's remedy and route to the developer path plus the explicit migration/seed commands the condition's own `remediation` string already carries (src/lib/diagnostics/conditions.ts:149).
```


#### Rank 10 — `docs/admin/create-your-site.md` — NARROWED

**Quoted:**

```text
The tool prints the honest cost picture first, the same facts as [Before you start](./before-you-start.md), so you see them before typing anything.
```

**Criterion:**

```text
packages/create-cairn-site/src/money.mjs:27-42, costPreamble() prints four facts. The fourth, "All in, a small site on its own domain runs about $6 a month.", appears nowhere in docs/admin. The admin profile ranks money surprises first among the anxieties and states that answering them early is a grading criterion (audience-profiles.md:99-103).
```

**Proposed change:**

```text
Either drop the equivalence claim, or add the missing figure to before-you-start.md so the claim becomes true. The second is better, since it's the one number an admin most wants: at the end of "What it costs", add "All in, a small site on its own domain runs about $6 a month: the $5 Workers Paid plan once a second person signs in, plus roughly $1 a month averaged over a year's domain renewal. The tool prints this same figure before it asks you anything."
```

**Kind:** coherence

**Verifier evidence:**

```text
QUOTE CHECK: docs/admin/create-your-site.md:19-22 reads exactly as quoted, in "Run the command" immediately after the `npx create-cairn-site` block. Not misquoted, not out of context.

ORDERING (untested by the finding, and the load-bearing half of the sentence): packages/create-cairn-site/bin.mjs:379 calls `printCostPreamble({ log, isFreshRun: !priorRecord })` before `collectAnswers`, with the in-code comment at bin.mjs:374-377 "The cost preamble opens the whole tool: an owner learns the money picture before typing a site name". So "prints the honest cost picture first ... before typing anything" is TRUE.

ABSENCE CLAIM: CONFIRMED. money.mjs:27-42 returns four blocks. Facts 1-3 map onto docs/admin/before-you-start.md: free-and-stays-free (money.mjs:30 -> before-you-start.md:25), domain $10-15/yr sold at cost with the Registrar link and 2026-08-11 date (money.mjs:32-35 -> before-you-start.md:35-39), Workers Paid $5/mo needed once anyone else signs in and billed per account with the pricing link and date (money.mjs:37-39 -> before-you-start.md:29-34). The fourth, money.mjs:41 `'All in, a small site on its own domain runs about $6 a month.'`, is absent from every published arm: `grep -rn '\$6\|6 a month\|All in' docs/` returns hits only in docs/superpowers/specs/2026-08-11-create-cairn-site-t4b-design.md:210-211, docs/superpowers/plans/2026-08-11-create-cairn-site-t4b.md:319, and docs/internal/record/2026-08-11-t4b-email-spike.md:172. Zero hits under docs/admin, docs/editors, docs/extend, docs/reference.

THE $6 IS TREATED AS A FACT INTERNALLY: packages/create-cairn-site/src/money.test.mjs:37-43, `test('costPreamble names all four things: free to build, the domain cost, the plan cost, and the all-in total')`, asserts `text.includes('$6')`.

WHY THE FINDING OVERREACHES: the $6 is arithmetic over two numbers before-you-start.md already states ($5/mo plus $10-15/yr = $0.83-$1.25/mo, so ~$6). "The same facts" is a substance-equivalence reassurance, not a transcript promise, and it is already loose in the opposite direction with no one calling that a defect: before-you-start.md:40-46 carries the Cloudflare API-token permission-row warning, which costPreamble() never prints. Against the admin profile's own grading question (docs/internal/record/2026-08-14-audience-profiles.md:112-114, "is any cost or prerequisite revealed after the step that incurs it?"), nothing arrives late here: both inputs to the $6 are on the earliest page of the track, under a heading named "What it costs".

PROPOSED-CHANGE CHECK: the suggested sentence's arithmetic is accurate against before-you-start.md:29-39 and its "$5 once a second person signs in" qualifier stays consistent with the free-until boundary at before-you-start.md:48-56, so option two is safe to adopt. Option one is not: dropping an accurate, independently verified sentence to satisfy a strict reading of "same facts" trades truth for tidiness.
```

**Revised finding:**

```text
The equivalence claim on docs/admin/create-your-site.md:19 is NOT false and should not be touched. What is real is a smaller, separate omission: the published corpus never states the all-in monthly figure that the tool prints and that the tool's own test suite treats as a required fact. The correct action is only the second half of the proposed change (add the figure to before-you-start.md's "What it costs"), as an improvement to the admin track's highest-anxiety topic, not as a repair of a false statement. The first half of the proposal (drop the equivalence claim) would make the page worse, trading an accurate, verified sentence for a vaguer one.
```


#### Rank 11 — `docs/admin/is-it-working.md` — UNVERIFIED

**Quoted:**

```text
This same condition id also covers two other checks: a media bucket your site's adapter declares but `wrangler.jsonc` doesn't (only on a site with an image library), and a tidy AI key binding.
```

**Criterion:**

```text
docs/internal/docs-register.md:180-182, the admin track's vocabulary contract: "Banned: adapter, seam, schema, frontmatter, island, runes, TypeScript, any engine-internal name." This sentence is addressed to the reader (the next sentence tells them to "read that rather than assuming"), not inside an "Ask a developer" block, so the term lands on the admin unglossed. The check itself is src/lib/doctor/checks-local.ts:35.
```

**Proposed change:**

```text
Say it without the engine noun: "This same condition id also covers two other checks: a storage bucket your site expects for images but `wrangler.jsonc` doesn't declare (only on a site with an image library), and a key for the tidy-up feature."
```

**Kind:** vocabulary


#### Rank 12 — `docs/admin/own-your-domain.md` — CONFIRMED

**Quoted:**

```text
Two browser moments cover this step: the fresh token's create-token page, and, later in the same run, a sign-in click when the tool commits its own deploy-config changes back to your repository under your name.
```

**Criterion:**

```text
packages/create-cairn-site/src/cloudflare/catalogue.mjs:657-669 ('builds-app-not-authorized'): if Cloudflare's GitHub App has never been authorized on the account, the run stops and says "Next: open https://dash.cloudflare.com/?to=/:account/workers-and-pages, connect your GitHub account when prompted, then re-run... --connect." That is a third browser trip, and the page names the authorization two sentences earlier as one of the three things the step needs.
```

**Proposed change:**

```text
The count contradicts the requirement the same paragraph just listed. Make it conditional the way the create-your-site page already handles its own optional Cloudflare sign-in: "Two browser moments cover this step once Cloudflare's GitHub App is already authorized on your account: the fresh token's create-token page, and, later in the same run, a sign-in click when the tool commits its own deploy-config changes back to your repository under your name. If it isn't authorized yet, the run stops first and tells you where to do that, then you re-run with `--connect`."
```

**Kind:** coherence

**Verifier evidence:**

```text
Quote verified verbatim at docs/admin/own-your-domain.md:127-129; the same page at :116-117 lists "a one-time authorization of Cloudflare's own 'Workers and Pages' GitHub App on your account" as one of the three things the step needs, so the page attaches the authorization to this step and then counts only two browser moments.

Code re-derivation (packages/create-cairn-site):
- src/cloudflare/api.mjs:101 and :356-357 map Cloudflare error code 8000008 to 'builds-app-not-authorized'.
- src/cloudflare/catalogue.mjs:657-669 builds that row as kind 'wait' with exactly the text quoted: open https://dash.cloudflare.com/?to=/:account/workers-and-pages, connect your GitHub account when prompted, then re-run ... --connect.
- src/cloudflare/chapter3.mjs:1033-1041 catches that code in the connect step, logs it, and parks the run (returns the outcome), so the run stops there.
- Ordering: token collection (browser trip 1, collectBuildsToken -> prefill.mjs:282 openBrowser) runs before the connect PUT; the reconcile sign-in click (browser trip 2, RECONCILE_DETAIL at chapter3.mjs:663-666) runs after it. The dashboard authorization therefore falls between the two moments the page counts.
- Exact count: the park does not clear the token (deleteApiToken at chapter3.mjs:912 and :1113 are not on this return path; collectBuildsToken records buildsTokenSavedAt at :825-829) and prefill.mjs:279-282 returns a valid saved token without opening a browser, so the re-run does not re-open the create-token page. The unauthorized path is exactly three browser moments.

The tool's own copy is conditional where the page is not: chapter3.mjs:648-661 (ADMISSION_DETAIL) says "a one-time authorization of Cloudflare's 'Workers and Pages' GitHub App on your account (if you have not already done this)". The page dropped the qualifier.

Corpus convention corroborates the proposed fix: docs/admin/create-your-site.md:47 counts a user-performed Cloudflare sign-in as "a third browser trip, only if you aren't signed in already", and :64-66 says "signing in to Cloudflare if you aren't already ... Three or four, depending on that middle one." So a user-initiated browser action counts as a browser moment here, and conditional trips are already stated conditionally elsewhere in the same track.

Refutations attempted and failed: (a) "the authorization is a prerequisite, not part of the step" is contradicted by the page's own line 116-117; (b) "browser moment means only pages the tool opens" is contradicted by create-your-site.md:47,64; (c) docs/admin/setup-recovery.md:77 does document the recovery row, but the page's count remains unconditional and the reader is left with three named requirements and two counted trips.

The proposed change makes the page more true, not merely tidier.
```

**Revised finding:**

```text
Substance stands; two wording precisions. The authorization is named one paragraph earlier (line 116-117), not "two sentences earlier". And the unauthorized run costs three browser moments in total, not a fourth create-token trip, because the parked run keeps the saved token (chapter3.mjs:825-829) and prefill.mjs:279-282 reuses a valid saved token without opening a browser.
```


#### Rank 13 — `docs/admin/invite-editors.md` — CONFIRMED

**Quoted:**

```text
Every person who can sign in is either an **owner** or an **editor**.
```

**Criterion:**

```text
Contradicted on the same page eleven lines later: "or, if your site declares roles other than owner and editor, a dropdown and a **Change** button let you pick among all of them". The engine supports a declared role vocabulary (src/lib/sveltekit/editors-routes.ts:87-94 returns `vocabulary`; src/lib/components/ManageEditors.svelte:130-140 renders the dropdown branch), and is-it-working.md covers `auth.role-wiring-missing` for exactly that case.
```

**Proposed change:**

```text
Open with the default rather than an absolute the page then walks back: "On a site set up by `create-cairn-site`, every person who can sign in is either an **owner** or an **editor**. (A developer can add other roles; if yours has, you'll see them as extra choices on this screen.)" Then the "Remove an editor" section's parenthetical reads as the same fact rather than an exception.
```

**Kind:** coherence

**Verifier evidence:**

```text
Quote check: docs/admin/invite-editors.md:13 reads verbatim "Every person who can sign in is either an **owner** or an **editor**." docs/admin/invite-editors.md:31-32 reads "(or, if your site declares roles other than owner and editor, a dropdown and a **Change** button let you pick among all of them)". Both quoted accurately and in context.

Engine claim verified by reading source, not inferred: src/lib/auth/roles.ts:12 (Capability = 'owner' | 'editor' | 'none'), :21 (RolesDeclaration = Record<string, RoleDeclaration>, arbitrary names), :24 (DEFAULT_ROLES is the implicit pair only when a site declares nothing), :58-76 (defineRoles accepts any vocabulary; 'owner' is the sole reserved name), :83-89 (an absent name resolves to 'none'). src/lib/sveltekit/editors-routes.ts:85-94 returns `vocabulary` on the editors load. src/lib/components/ManageEditors.svelte:38-43 derives isDefaultVocabulary (exactly two entries, owner and editor) and :117-142 branches, rendering the bare Make owner/Make editor toggle only in the default case and a select over data.vocabulary plus a Change button otherwise; the add form at :169-176 always renders the full vocabulary.

Audience check: the same admin track already serves the custom-role reader. docs/admin/is-it-working.md:223-226 documents `auth.role-wiring-missing` ("Your site declares custom roles"), :215-221 documents `auth.unknown-role`, and docs/admin/troubleshooting.md:86-96 is a full symptom section for a role that "resolves to no access rather than to owner or editor." docs/internal/docs-register.md:186-187 puts "inheriting a running site someone else created" in the admin track's arrival state, so a reader on a non-default vocabulary is inside this page's audience by the track's own contract.

Proposed-change check (does it make the page more true): yes. `grep -rn "roles" packages/create-cairn-site` returns zero hits, confirming a create-cairn-site site receives DEFAULT_ROLES, so scoping the sentence to the scaffolded site is factually correct rather than merely tidier. `create-cairn-site` is already free vocabulary in this track (docs/admin/is-it-working.md:208).

Two refinements, neither fatal to the finding: (1) the distance is eighteen lines (13 to 31), not the "eleven" the finding states; (2) a fix touching only line 13 is incomplete, since the section heading at line 11 ("## Owner versus editor") and line 31's "moves them between the two" carry the same binary framing, and "the two" becomes a dangling referent once the opening admits more than two. Separately, even on a default site the absolute has an edge case neither wording closes: roles.ts:83-89 plus is-it-working.md:215-218 confirm a person with an undeclared role can still sign in while being neither owner nor editor; that is an anomaly state, not a design, and does not change the verdict.
```

**Revised finding:**

```text
The contradiction is real and the proposed direction is correct, but the fix must reach three places, not one: line 13's absolute, the line 11 heading "Owner versus editor", and line 31's "moves them between the two" (which becomes a dangling referent once the opening admits more than two roles). The finding's "eleven lines later" is actually eighteen.
```


### `docs/editors` (10 findings, all 10 verified)

10 findings.

**Coverage note (as reported by the sweep):**

```text
Full sweep: all 8 pages in docs/editors (README, welcome, write-in-the-editor, add-an-image, manage-the-media-library, manage-your-tag-vocabulary, publish-and-history, when-something-goes-wrong), roughly 170 decomposed claims traced to source lines under src/lib. Verified clean (naming a few, since a negative result is evidence): every numeric claim checked exact and correct — the 10-minute link expiry and the once-per-minute throttle (auth/crypto.ts:59,64), the ~one-month session (SESSION_TTL_MS = 30 days, crypto.ts:62), the 25-publish history cap plus its on-screen truncation note (content-routes-core.ts:1113,1173 and CairnHistory.svelte:87); all ten keyboard shortcuts against editor-shortcuts.ts and the EditorToolbar tooltips; the three toolbar group names and the three More-formatting items; all four figure placements; all four sign-in messages and all four image-upload messages and every other quoted refusal in when-something-goes-wrong.md except the one filed as rank 1 (traced to refusal-codes.ts, content-routes-core.ts, content-routes-tidy.ts:119, CairnHistory.svelte:69-76, taxonomy-enforce.ts:51, MediaHeroField.svelte:318, EditPage.svelte:1134); the save/publish flash strings (EditPage.svelte:1350-1352); the New/Edited/Published statuses and the Hidden-is-still-reachable claim (content-index.ts:149-153, byId does not filter); the tidy review's Accept fixes / Review this / Reject all / one-undo behaviour (TidyReview.svelte:190-212, tidy-categorize.ts:33-39); the three objective spelling checks (objective-errors.ts:1-63); the paste conversion list (paste-html-to-markdown.ts:1-9); the fold-on-open behaviour (editor-folding.ts:502-517); and the whole tag-vocabulary page. Left unverified: (a) whether a hidden entry is truly reachable at its address on a live site — I confirmed the engine's `byId` does not filter drafts, but the consuming site owns its route, so this is engine-true and site-dependent; (b) "Preview... shows the entry roughly as it will look on your site", a fidelity judgement with no checkable referent; (c) the preview-link expiry window, which the page states as a rendered date rather than a number, so there was no value to check. Method limit: every finding is source-traced, not executed in a browser; the only empirically-backed one is rank 2, which an existing test (src/tests/component/edit-page-advisories.test.ts:72-83) asserts directly.
```

#### Rank 1 — `docs/editors/when-something-goes-wrong.md` — CONFIRMED

**Quoted:**

```text
**"This page links to N missing pages."** with a list of addresses: a link in your draft points somewhere that doesn't exist on your site
```

**Criterion:**

```text
src/lib/components/EditPage.svelte:1875 is the visible alert an editor actually sees: "This page links to {a page|pages} that no longer {exists|exist}. Remove the broken {link|links} and save again." The quoted string exists only at EditPage.svelte:1379, inside the `sr-only` assertive live region, so it is never rendered on screen. This breaks the page's own stated contract at line 4-5: "Every message below is quoted exactly as it appears, so you can match it to what you're seeing."
```

**Proposed change:**

```text
Replace the quoted heading with the visible text: **"This page links to pages that no longer exist. Remove the broken links and save again."** Keep the rest of the entry (the list of addresses and the **Remove link** button beside each) as written; both are correct (EditPage.svelte:1876-1882).
```

**Kind:** factual

**Verifier evidence:**

```text
Re-derived from scratch; the finding survives, and the mechanism is stronger than "wrong line number."

1. The quoted line exists and says what the finding claims.
`/home/glw907/Projects/cairn-cms/.claude/worktrees/pass-d-phase-3/docs/editors/when-something-goes-wrong.md:44` reads: `**"This page links to N missing pages."** with a list of addresses: a link in your draft points somewhere that doesn't exist on your site...`. The page's contract is at lines 4-5: "Every message below is quoted exactly as it appears, so you can match it to what you're seeing." Not misquoted, not out of context.

2. The visible banner says something else.
`src/lib/components/EditPage.svelte:1874-1876`: the `{#if visibleBrokenLinks.length}` alert renders `This page links to {…'a page':'pages'} that no longer {…'exists':'exist'}. Remove the broken {…'link':'links'} and save again.` The list of `<code>` addresses with a **Remove link** button per row follows at 1877-1884, so the finding is right that the rest of the doc entry is accurate.

3. The quoted string exists only where it cannot be seen — and this is structural, not incidental.
- `EditPage.svelte:1379` builds `This page links to ${count} missing ${count === 1 ? 'page' : 'pages'}.` inside `assertiveMessage`, which is consumed at `EditPage.svelte:1834` by `<div class="sr-only" aria-live="assertive">`. No `sr-only` override exists in the repo's CSS (grep over `src/lib/**/*.css` returned nothing), so it is Tailwind's standard visually-hidden utility.
- The same string is also the server's `error` value: `src/lib/sveltekit/content-routes-core.ts:1366-1372` returns `fail(400, { error: \`This page links to ${absent.length} missing ${noun}.\`, brokenLinks: absent, body })`.
- That server string is suppressed from the screen by construction. `EditPage.svelte:1292-1294`: `const formError = $derived(form?.error && !form.brokenLinks?.length && !form.inboundLinks?.length ? form.error : '')`, and `formError` is the only thing rendered by the visible alert at 1853-1855. The link guard is the one refusal that always ships a non-empty `brokenLinks` (1368: `brokenLinks: absent`, inside `if (absent.length)`), so `formError` is guaranteed empty on exactly this refusal. The string can never reach the screen.
- The repo asserts this on purpose. `src/tests/component/EditPage.test.ts:717-733` feeds `error: 'This page links to 1 missing page.'` plus `brokenLinks`, comments "the page renders only the richer broken-links banner, never a second alert," and asserts `expect(screen.container.querySelectorAll('.alert')).toHaveLength(1)` while checking the surviving banner contains `cairn:pages/gone`.

4. The proposed change makes the page more true, with one refinement.
Replacing line 44's heading with the 1875 text trades a string an editor can never see for the one they do see. The finding's replacement quotes only the plural rendering; the singular renders "This page links to a page that no longer exists. Remove the broken link and save again." The page already uses a parenthetical-placeholder convention for variable text (line 50: "unpublished pages (their addresses)"), so the fix should either use the plural form as representative or mark the variation the same way, rather than silently documenting one of two renderings.

Nuance that does not refute: the quoted string is not fictional. It is the server's error payload and it is announced verbatim to screen-reader users through the assertive live region. It is simply never *visible*, which is precisely what this page's stated contract ("match it to what you're seeing") is about.
```

**Revised finding:**

```text
The finding is correct as raised. The only refinement: the replacement text should account for both renderings (singular "a page that no longer exists / the broken link" vs plural), using the page's existing placeholder convention rather than quoting only the plural form.
```


#### Rank 2 — `docs/editors/write-in-the-editor.md` — CONFIRMED

**Quoted:**

```text
An image left with neither stays flagged as needing alt text until you describe it or mark it decorative.  ...  If you mark a picture in your text decorative, then close the entry and reopen it, it reads as needing alt text again.
```

**Criterion:**

```text
For a picture in the text, marking it decorative never clears the flag, and the flag does not wait for a reopen. The notice is re-derived from the body text on every keystroke (EditPage.svelte:1231 `const needsAlt = $derived(findMediaImagesNeedingAlt(body))`), and that scanner flags any media image whose alt is empty (markdown-format.ts:217-224), which is exactly what a decorative choice writes (MediaCaptureCard.svelte:15-18). MediaHeroField.svelte:16-18 states the rule: "A decorative body image (`![](media:...)`) cannot persist the same choice, since markdown alt has no slot for it." The existing test src/tests/component/edit-page-advisories.test.ts:74-79 renders `![](media:cat.<hash>)` and asserts "1 image needs alt text" on first render.
```

**Proposed change:**

```text
Rewrite both passages to match: a picture in your text that you mark decorative keeps showing as needing alt text the whole time, not only after a reopen, because the text itself has nowhere to record the choice. Say plainly that this is cosmetic (the published page still treats it as decorative) and that only an entry's lead picture, set from Details, remembers a decorative choice and drops the flag (MediaHeroField.svelte:14-16).
```

**Kind:** factual

**Verifier evidence:**

```text
QUOTE CHECK (both passages exist verbatim and in the claimed context)
- /home/glw907/Projects/cairn-cms/.claude/worktrees/pass-d-phase-3/docs/editors/write-in-the-editor.md:96-99 "Mark an image decorative when it carries no information of its own... An image left with neither stays flagged as needing alt text until you describe it or mark it decorative."
- Same file:100-104 "If you mark a picture in your text decorative, then close the entry and reopen it, it reads as needing alt text again. Nothing is wrong; there's simply nowhere in the text itself to remember that choice. Leave it; marking it decorative still works when you publish, it just doesn't stay checked the next time you look."
The section is the "## Images" body-image section (heading at :87), so the context is exactly what the finding says. The reopen framing is not a misquote: "it reads as needing alt text again" plus "it just doesn't stay checked the next time you look" asserts that the flag clears in-session and returns only on reopen.

WHAT THE CODE DOES (I tried to find a session-scoped decorative memory that would make the doc true; there is none)
1. The notice is a pure function of the live body, recomputed on every edit: src/lib/components/EditPage.svelte:1231 `const needsAlt = $derived(findMediaImagesNeedingAlt(body));` with the comment at :1228-1230 "recomputed as the author types". Total count at :1244 `needsAlt.length + heroRows.length`; the notice renders whenever `needsAltCount` is non-zero (EditPage.svelte:1256-1260). No decorative set, no suppression state, no per-insert exemption.
2. The scanner flags any media image whose alt is empty or whitespace: src/lib/components/markdown-format.ts:214-228 (`if ((node.alt ?? '').trim() !== '') return;` at :220).
3. A decorative body insert writes exactly that text. MediaCaptureCard.svelte:15-18 (@component): "A decorative choice also resolves alt to the empty string... the emitted record uses an empty alt string for both the decorative and the left-blank cases." MediaInsertPopover.svelte:182 `editor.insertImage(sel.alt, sel.ref)` and :295 `editor.placeholders.resolveTo(pid, record.alt, outcome.reference)` insert that empty alt into the body. Test src/tests/component/MediaCaptureCard.test.ts:87-100 asserts `record.alt` is `''` after clicking the decorative radio.
4. So immediately after a decorative insert the body holds `![](media:slug.hash)` and step 1+2 flag it on that same keystroke. There is no code path in which a decorative body image is unflagged, in-session or otherwise.
5. Corroborating engine comment, which states the rule directly: MediaHeroField.svelte:15-18 "The decorative choice persists for the frontmatter hero because the hero value is an object with a slot for it... A decorative body image (`![](media:...)`) cannot persist the same choice, since markdown alt has no slot for it, so a decorative body image still reads as needs-alt on reload."
6. The toolbar surface agrees, and contradicts "it stays checked": MediaFigureControl.svelte:112-117 renders `data-cairn-alt-status="needs"` with `aria-label="Alt text: needs a description"` whenever `decorative` is true, and EditPage.svelte:839-847 derives `figureDecorative` purely from an empty alt in the source token. The editor has no way to tell a decorative body image from a blank one at any moment, not merely after a reload.
7. The hero half of the finding checks out: MediaHeroField.svelte:140-157 resolves status to 'decorative' when `committedDecorative`, which reports `needsAlt` false to the host, and :471 persists it as the hidden `<name>.decorative` input, so the hero is the one place a decorative choice clears and keeps the flag off.

EXECUTION
- `npx vitest run src/tests/unit/markdown-format.test.ts -t "findMediaImagesNeedingAlt"` → 9 passed. Includes :203-213 flagging `![](media:cat.0123456789abcdef)` and :214-219 flagging a whitespace-only alt. The existing component test src/tests/component/edit-page-advisories.test.ts:72-83 renders that same body and asserts "1 image needs alt text" on first render.

IS THE PROPOSED CHANGE MORE TRUE? Yes.
- The doc's "marking it decorative still works when you publish" is accurate and should survive: an empty alt is the HTML decorative signal, and the media rewrite carries the empty alt through. Keep that reassurance.
- What must change is the timing and the "stays checked" implication. Worth adding beyond the finding: a decorative choice is only ever offered at insert time (the describe-or-decorative radiogroup lives in MediaCaptureCard and MediaHeroField, nowhere else), so for a picture in the text the notice is present from the moment the image lands and never clears. One extra wrinkle the finding did not name, which argues the same way: src/lib/content/media-rewrite.ts:308-364 classifies an empty-alt body image as `will-fill` while a decorative hero is `decorative-skipped`, so a library-driven alt fill will write a description over a body image's decorative intent. Body decorative is genuinely unrecorded, not merely unremembered across a reopen.
- The page's first sentence (:97-99) is also wrong as written for the case it sits in: for a picture in the text, marking it decorative does not end the flag. It is true only for the lead picture set from Details.
```


#### Rank 3 — `docs/editors/publish-and-history.md` — NARROWED

**Quoted:**

```text
If several entries have unpublished changes, a **Publish site** button appears near the top of the editor, showing how many.
```

**Criterion:**

```text
CairnAdminShell.svelte:643-650 renders the "Publish site ({pending.length})" pill only inside the `{:else}` arm of `{#if isDeskRoute}` (line 622). `isDeskRoute` is true for exactly `/admin/<concept>/<id>`, the entry-writing screen (CairnAdminShell.svelte:414-417), and EditPage.svelte carries no publish-all control of its own (no `publishAll` or "Publish site" occurrence in the file). Every neighbouring section of this page (Save, Publish, Discard, Delete, History) describes controls on the open-entry screen, so "the top of the editor" points the reader at the one screen where the button is absent.
```

**Proposed change:**

```text
Say where it actually is: "a **Publish site** button appears at the top of the screen whenever you are on a list, showing how many. It is not there while you have an entry open; go back to a list to see it."
```

**Kind:** procedural

**Verifier evidence:**

```text
QUOTE CHECK (passes). `docs/editors/publish-and-history.md:65-67`, section "Publishing everything at once": "If several entries have unpublished changes, a **Publish site** button appears near the top of the editor, showing how many." Quoted accurately and in context.

SOURCE CHECK (the finding's empirical half is fully CONFIRMED, and I re-derived it independently):

1. `src/lib/components/CairnAdminShell.svelte:622` opens `{#if isDeskRoute}`; the desk arm (623-626) renders only `{@render topbar.desk?.()}`. The "Publish site ({pending.length})" pill is at `:644-651`, inside the `{:else}` arm. The authoring comment at `:623-625` states the intent outright: "The palette trigger and the site-wide Publish button stand down so the band has one job here."

2. `CairnAdminShell.svelte:414-417`: `isDeskRoute` is `segs.length === 3 && segs[0] === 'admin' && concepts.some(c => c.id === segs[1])`, i.e. exactly `/admin/<concept>/<id>`, the open-entry screen. The comment at `:412-413` adds that the deeper `/history` view is "an office screen again, so it keeps office chrome."

3. `src/lib/components/EditPage.svelte` carries no publish-all control: `grep -n "publishAll\|Publish site\|pendingEntries"` returns nothing (exit 0, zero matches). Its 28 "pending" hits are all `data.pending`, this entry's own dirty state (`:190 publishActionable = dirty || data.pending || data.isNew`), not the site-wide set.

4. The behaviour is pinned by a test, so it is not incidental: `src/tests/component/CairnAdminShell.test.ts:289-302`, "stands down the palette trigger and the site Publish button on a desk route", renders at `/admin/posts/2026-05-hello` with a non-empty `pendingEntries` and asserts `navbar.textContent` does not contain 'Publish site'. The dialog markup (`CairnAdminShell.svelte:750-755`) does stay in the DOM on a desk route, but its only trigger (`:647`) does not.

So the fact underlying the finding is real: an editor with several pending entries who is looking at an open entry cannot see this button, and the page never says so.

WHERE THE FINDING OVERREACHES. Its claim is that "the top of the editor" affirmatively "points the reader at the one screen where the button is absent". That does not survive the track's own vocabulary. "The editor" in `docs/editors/` denotes the admin app, not the entry screen: `README.md:3-4` ("help for the editor you write in"), `welcome.md:16` "You'll land in the editor, signed in" (the landing is an office/list route, not an open entry), `welcome.md:35` "the sign-out control lives with your name in the editor's sidebar", `welcome.md:37` "If the editor looks empty". Read that way the sentence is not false, and "near the top" correctly names the topbar, matching `docs/reference/components.md:144` ("the topbar shows a 'Publish site (N)' button"). The defect is an omitted precondition, not a wrong pointer.

REVISED SEVERITY AND SCOPE. The sentence states one condition for the button ("if several entries have unpublished changes") when there are two; the second, which screen you are on, is missing. The section's placement amplifies it, since the six neighbouring sections (Save, Publish, status, Change URL, Discard, Delete, Share preview, History) all describe open-entry controls, so a reader who satisfies the stated condition and looks where the surrounding page has trained them to look finds nothing. That is a real omission worth fixing, at roughly the rank it was given.

THE PROPOSED CHANGE IS ALSO IMPRECISE. "whenever you are on a list" is under-inclusive against `:414-417`: the button renders on every non-desk `/admin/**` route, which includes media, editors, settings, help, and the entry's own `/history` view (explicitly kept as office chrome, `:412-413`). The accurate constraint is that it is absent only while an entry is open. A fix should add that one clause rather than adopt the proposed wording verbatim.
```

**Revised finding:**

```text
The "Publish site (N)" control is verifiably absent on the open-entry screen (`CairnAdminShell.svelte:622` gates it into the non-desk arm; `isDeskRoute` at `:414-417` is exactly `/admin/<concept>/<id>`; `EditPage.svelte` has no publish-all; pinned by `CairnAdminShell.test.ts:289-302`), and `docs/editors/publish-and-history.md:65-67` states only the pending-count condition, never the location one, in a section surrounded by open-entry controls. But the sentence is incomplete, not false: this track uses "the editor" for the whole admin app (`docs/editors/README.md:3-4`, `welcome.md:16,35,37`), and "near the top" correctly names the topbar. The fix is one added clause saying the button is not there while an entry is open, not the proposed "whenever you are on a list", which is under-inclusive since the button also shows on media, editors, settings, help, and the entry's /history view.
```


#### Rank 4 — `docs/editors/README.md` — REFUTED

**Quoted:**

```text
If you came from the **Get help** link inside the editor, you're in the right place.
```

**Criterion:**

```text
No control named "Get help" leads here. The admin's sidebar item is labelled **Help** and points at `/admin/help` (src/lib/sveltekit/admin-nav.ts:404 `help: { label: 'Help', href: '/admin/help' }`). The one control literally labelled "Get help" is the Help screen's conditional support link (HelpHome.svelte:329-335), which renders only when the site configures a support URL and opens the site's own contact, not this documentation. The editor profile's arrival clause names "the admin's Help link", not a Get help link.
```

**Proposed change:**

```text
Name the control that exists: "If you came here from the **Help** link in your site's sidebar, you're in the right place." If the intended path is the Help screen linking out to these pages, that link has to be built before the sentence can claim it.
```

**Kind:** factual

**Verifier evidence:**

```text
The quoted line exists verbatim (docs/editors/README.md:3-4: "If you came from the **Get help** link inside the editor, you're in the right place."), but both empirical claims behind the finding are false.

CLAIM 1 — "renders only when the site configures a support URL." False. The runtime composes a default. src/lib/content/compose.ts:18 `const DEFAULT_SUPPORT_CONTACT = 'https://cairn.pub/help';` and :44 `supportContact: adapter.editor?.supportContact ?? DEFAULT_SUPPORT_CONTACT`. So every site that sets nothing gets the link; the component's own contract comment says so (HelpHome.svelte:15-18: "The runtime composes a default here (cairn's hosted editor help) when a site sets no `editor.supportContact`"). HelpHome.svelte:76-83 classifies `https://cairn.pub/help` as `kind: 'url'`, which is exactly the branch that renders the anchor whose text is "Get help" (HelpHome.svelte:329-337). The email override renders "Email support" instead, not "Get help".

CLAIM 2 — "opens the site's own contact, not this documentation." False in the default case: the default href IS this documentation. docs/editors is shipped in the package (package.json:171 `"docs/editors"`), and cairn.pub renders it at /help — docs/superpowers/specs/2026-08-09-docs-refactor-brief.md:82-83 ("The admin's Help home carries a 'Get help' hand-off whose default is `DEFAULT_SUPPORT_CONTACT = 'https://cairn.pub/help'`") and :116 ("cairn.pub/help is live, the admin links to it by default"); 2026-08-09-admin-setup-and-docs-reset-design.md:14 ("The editor ... Served: six guides, delivered through cairn.pub `/help` and the admin's Get help link").

EXECUTED: `npx vitest run src/tests/component/help-home.test.ts -t "hosted-help default"` — 1 passed. The test (src/tests/component/help-home.test.ts:58-64) renders with `supportContact: 'https://cairn.pub/help'`, asserts a link with accessible name /Get help/ and `href="https://cairn.pub/help"`. The reader of docs/editors/README.md on cairn.pub/help is, by construction, someone who followed that link.

The profile does not contradict the page either: docs/internal/record/2026-08-14-audience-profiles.md:40 reads "Through the admin's Help link (cairn.pub/help)" — its own parenthetical names the docs destination, not /admin/help.

The proposed change would make the page LESS true. admin-nav.ts:404 `help: { label: 'Help', href: '/admin/help' }` is correct as a citation, but that sidebar Help link opens the in-admin Help home screen, not this documentation tree. Rewriting the sentence to "If you came here from the **Help** link in your site's sidebar" would assert a path that does not lead here, replacing an accurate statement with a false one.
```

**Revised finding:**

```text
None. The only residual is that a site overriding `editor.supportContact` with an email or free text gets "Email support" or no link, but the sentence is conditional ("If you came from...") and such a reader would not arrive at cairn.pub/help by that route anyway.
```


#### Rank 5 — `docs/editors/manage-the-media-library.md` — CONFIRMED

**Quoted:**

```text
If the new picture would break how it displays somewhere, you'll see that up front rather than after the fact.
```

**Criterion:**

```text
The replace preview computes no breakage. src/lib/media/rewrite-plan.ts:123-125 returns exactly `{ entries, branchDelta, affectedCount }`, and the review step renders only three things: the published entries that will be repointed (CairnMediaLibrary.svelte:2156-2188), open edits on their own branches that keep the old file (2190-2207), and the note "The old file stays in git history" (2210-2213). Nothing inspects dimensions, aspect, or layout, so there is no state in which this promised warning can appear.
```

**Proposed change:**

```text
Replace the sentence with what the review actually shows: the list of published entries that will point at the new file, and a separate note for any unpublished edits that keep the old file until they are published.
```

**Kind:** factual

**Verifier evidence:**

```text
Quote verified: docs/editors/manage-the-media-library.md:38-42 contains the sentence verbatim, in the "Replacing an image" section, immediately after "the editor shows you what would change everywhere the image appears before it applies anything." Not clipped or out of context; the page uses the same "would break how that appears" phrasing for delete (lines 55-57) where a real breakage warning exists, so the sentence reads as a concrete promise.

Empirical re-derivation of the replace path:
- src/lib/media/rewrite-plan.ts:125 returns exactly `{ entries, branchDelta, affectedCount: entries.length }`. The RewritePlan interface (lines 56-63) carries only those three fields. The plan is built from buildUsageIndex plus a markdown transform (repointMediaRef); it never reads image bytes.
- src/lib/sveltekit/content-routes-media.ts:198-202 defines MediaReplacePreviewPlan as `{ affectedCount, entries, branchDelta }`, and mediaReplacePreviewAction (1062-1129) only enriches entries with title/permalink from the content manifest before returning them.
- `grep -rn "aspect|dimensions|widthPx|heightPx" src/lib/media/*.ts` returns a single hit, a doc comment at manifest.ts:10 about width/height being nullable manifest fields. No old-vs-new dimension or aspect comparison exists anywhere in the replace path.
- Review-step markup, CairnMediaLibrary.svelte:2136-2219, renders: the from/to content-hash strip ("The name ... stays the same. Only the content hash changes, so every published entry is repointed to the new file in one commit"), "Published entries that will be repointed" (2157), "Open edits still on the old file" (2198-2207, "Each keeps the old file until it is published again"), "The old file stays in git history..." (2212), and the typed-slug confirm gate (2216-2219). The only other terminal state is the `blocked` step (2233+), whose text is "Usage could not be fully verified" - a fail-closed refusal on an unreadable branch, unrelated to the new picture's properties.
- Upload-step failures are the ingest taxonomy only (client-ingest.ts:193-198: unsupported format, transcode failed, too large, network). None concerns display.

So no state exists in which the promised warning can appear. Under the layout reading nothing is computed; under the broken-reference reading a replace repoints every published reference in one commit, so the case never arises.

The proposed change is more true: it describes exactly lines 2157 and 2198-2207, and the preceding sentence remains accurate on its own.

Adjacent, outside this finding: the page never mentions that every replace requires typing the image's address to confirm (CairnMediaLibrary.svelte:2216-2219), though it does describe that gate for delete.
```

**Revised finding:**

```text
Confirmed as raised. (Optional strengthening, not required by the finding: the same section also omits the type-the-address confirm gate that every replace requires, per CairnMediaLibrary.svelte:2216-2219.)
```


#### Rank 6 — `docs/editors/manage-the-media-library.md` — CONFIRMED

**Quoted:**

```text
To clear out several images together, select them first: pressing Space selects the one you're focused on, Shift with an arrow key extends that to a run of images, and Ctrl (or Cmd on a Mac) with A selects everything showing.
```

**Criterion:**

```text
Every documented path is a keyboard chord that first requires moving the roving focus. Each tile carries a visible selection checkbox that is the ordinary pointer path (CairnMediaLibrary.svelte:1541-1553: "The selection checkbox, top-left: a real native checkbox... Clicking it toggles the selection only; it never opens the slide-over"; the list view repeats it at 1638-1641). The editor profile's floor is "competent with a browser... no reason to have met a terminal", and its success criterion is finishing without asking a developer; a reader on a mouse or a tablet cannot follow any of the three documented steps.
```

**Proposed change:**

```text
Lead with the checkbox: "Each image has a small checkbox in its top-left corner; select the checkbox on each image you want. From the keyboard, Space selects the image you're focused on, Shift with an arrow key extends to a run, and Ctrl (or Cmd on a Mac) with A selects everything showing."
```

**Kind:** procedural

**Verifier evidence:**

```text
Quote verified verbatim at docs/editors/manage-the-media-library.md:63-65 ("Deleting several images at once"); the page mentions no checkbox anywhere (grep over docs/editors/ returns only an unrelated "Hidden" checkbox at publish-and-history.md:33).

Source confirms the pointer path the page omits:
- src/lib/components/CairnMediaLibrary.svelte:1546-1555 — every grid tile renders an unconditional native <input type="checkbox" class="checkbox"> in an absolute left-2 top-2 z-10 chip, with onclick stopPropagation and onchange={() => toggleSelect(asset.hash)}. Always visible, not hover-revealed.
- CairnMediaLibrary.svelte:1636-1644 — the list view repeats it as a leading per-row checkbox column.
- CairnMediaLibrary.svelte:1714-1716 — the sticky bar carries pointer-operable "Select all {visible.length}" and "Clear" buttons.
- CairnMediaLibrary.svelte:1696 — the whole bar is gated behind {#if selectedCount > 0}, so a pointer user cannot reach "Select all" without first clicking a tile checkbox. The checkbox is the only pointer entry into bulk selection.

The documented chords are themselves accurate (so this is an omission, not a false statement): onGridKeydown at CairnMediaLibrary.svelte:1329-1361 — Ctrl/Cmd+A → selectAllVisible() (1331-1334), Shift+Arrow → selectRange (1339, 1344), Space → toggleSelect (1352-1355).

Profile criterion verified: docs/internal/record/2026-08-14-audience-profiles.md:34-38 ("Competent with a browser... no reason to have met a terminal"), :42-43 ("They read on whatever device the admin is open on"), :61-62 (success = done without asking a developer).

Finding is understated in one respect: onGridKeydown is wired only to the grid tile (CairnMediaLibrary.svelte:1539), and the component's own header at :13-15 states the list density "is a plain selectable table whose leading native-checkbox column is the selection signal (no grid role, since it has no grid keyboard model)". So in list view — which the page itself introduces at :10-11 — none of the three documented chords work for any reader, keyboard or pointer.

Secondary support: the page's own vocabulary collides. ":21-24 "Selecting an image" defines select as opening details (matching onclick={(e) => openAsset(...)} at :1538); :54 "Select Delete" means click a button; :63 "select them" means checkbox-selection. A reader applying the page's earlier definition clicks a tile and gets the slide-over.

Proposed change makes the page more true: it keeps the accurate keyboard sentence intact and adds the affordance that exists. Two refinements so the fix does not introduce a new error — "top-left corner" holds only in grid view (list view is a leading column, :1636-1644), and Ctrl/Cmd+A has a pointer twin worth naming, the bar's "Select all N" (:1714-1716).
```

**Revised finding:**

```text
Finding stands as raised, with one amplification: beyond excluding pointer and touch readers, the three documented chords do not function at all in the library's list view (onGridKeydown is bound only to grid tiles at CairnMediaLibrary.svelte:1539; the header comment at :13-15 states the table has no grid keyboard model), where the per-row checkbox at :1636-1644 is the only selection affordance. The fix should name the checkbox as the primary path and describe its position per view (top-left of a tile in grid; leading column in list), and may add the bar's "Select all N" button (:1714-1716) as the pointer twin of Ctrl/Cmd+A.
```


#### Rank 7 — `docs/editors/manage-the-media-library.md` — NARROWED

**Quoted:**

```text
You'll choose a new file, and the editor shows you what would change everywhere the image appears before it applies anything.
```

**Criterion:**

```text
The step omits the gate that stands between the review and the replace: the editor must type the image's address before the button will act (CairnMediaLibrary.svelte:2216-2217, label "Type <slug> to replace the file in all N entries", input placeholder "Type the asset's address", gated by `confirmGateMatches` at typed-confirm.ts:11). The Deleting section of this same page documents the equivalent gate; a reader following this section stops at an apparently dead button.
```

**Proposed change:**

```text
Add the missing step after the review sentence: "Then type the image's address, the same as for a delete, and select Replace."
```

**Kind:** procedural

**Verifier evidence:**

```text
Quote verified verbatim at docs/editors/manage-the-media-library.md:39-40.

The gate exists and is unconditional for replace: CairnMediaLibrary.svelte:2216 (label "Type {asset.slug} to replace the file in all {replaceAffected} entries."), :2217 (input, placeholder "Type the asset's address"), :350 (replaceConfirmMatches via confirmGateMatches), :2237 (submit disabled={!replaceConfirmMatches}); typed-confirm.ts:11. Enforced server-side at src/lib/sveltekit/content-routes-media.ts:1213-1214, whose own comment reads "The typed-slug gate, ALWAYS required for replace" and returns fail(409) on mismatch. The 2216-2217 block has no {#if} wrapper (the preceding branchDelta conditional closes at :2207), so it renders on every successful preview. The page never mentions it. That half is real.

Two parts do not survive. (1) "a reader following this section stops at an apparently dead button" is refuted by the markup: the disabled button at :2237 sits immediately under a visible instruction label and a placeholder that both state what to type, so the dialog self-describes. The delete dialog the page DOES document (:2014-2015) is self-describing in exactly the same way, so documentation is not what rescues the reader there either. (2) The proposed sentence introduces two new errors: "the same as for a delete" is false, since delete's gate is conditional on deleteInUse (:2010, :2012-2016, :2021-2023 - an unused image gets a plain "Delete it" with no gate) while replace's is unconditional; and "select Replace" misnames the control, which reads "Replace in {N} entries" (:2238).

Separately verified and outside this finding: the same section's line 40-42 ("If the new picture would break how it displays somewhere, you'll see that up front") has no code referent. No dimension or aspect check exists in the replace flow (dimensions() at :1384 feeds only the details panel at :1896), and the blocked step (:2242-2270) concerns unverifiable usage, not display breakage; the review panel states alt text is left exactly as is (:2211).
```

**Revised finding:**

```text
Real but smaller than claimed: a one-clause omission that is an internal-consistency gap, not a comprehension blocker. The page documents the typed gate for a single delete (line 56) and the orphan purge (line 75) but not for replace, the one place the gate fires unconditionally. It does not threaten the editor profile's success criterion, since the on-screen label and placeholder complete the task without the doc. The fix is a clause naming the typed confirmation, NOT the proposed sentence, which would assert a false parallel with delete (whose gate is conditional) and misname the button ("Replace in N entries").
```


#### Rank 8 — `docs/editors/write-in-the-editor.md` — CONFIRMED

**Quoted:**

```text
and once the image has a caption the same button reads **Edit the figure at the cursor**.
```

**Criterion:**

```text
The label flips on whether the image sits in a figure, not on whether it has a caption: EditPage.svelte:832-837 selects 'Edit the figure at the cursor' from `mediaAtCaret?.figure` alone. A figure can be created with a placement and no caption at all, since Placement is an independent control in the same form (MediaFigureControl.svelte:25-30, options Measure / Center / Wide / Full).
```

**Proposed change:**

```text
Change the trigger to the real one: "and once the image sits in a figure, whether you gave it a caption, a placement, or both, the same button reads **Edit the figure at the cursor**."
```

**Kind:** factual

**Verifier evidence:**

```text
1. The quoted line exists and says what the finding claims. docs/editors/write-in-the-editor.md:105-109: "Once an image is in your draft, you can give it a caption and choose how it sits on the page. Put your cursor on the image, then select the toolbar button whose tooltip reads **Wrap the image at the cursor in a figure**. It stays dim until your cursor is on an image, and once the image has a caption the same button reads **Edit the figure at the cursor**." Not a misquote, and the surrounding context does not rescue it: the very next bullets (lines 111-117) present caption and placement as two independent things the dialog gives you, so the page has already told the reader a placement can exist without a caption while claiming the label flips on the caption.

2. The label logic keys on the figure, not the caption. src/lib/components/EditPage.svelte:832-838:
   const figureLabel = $derived(
     figureAvailable
       ? mediaAtCaret?.figure
         ? 'Edit the figure at the cursor'
         : 'Wrap the image at the cursor in a figure'
       : 'Place the cursor on an image to add a figure',
   );
   The only discriminator is `mediaAtCaret?.figure` (the FigureAtImage object), never its `caption` field. That value feeds both `aria-label` and `title` at EditPage.svelte:2156-2157, so it is exactly the tooltip the page describes.

3. A caption-less figure is reachable and is a real figure. Placement is an independent control: MediaFigureControl.svelte:25-30 declares ROLE_OPTIONS = Measure (null) / Center / Wide / Full, and caption is a separate free-text field (caption prop, MediaFigureControl.svelte:35, 53). EditPage.svelte:967-975 `applyFigure` calls `wrapImageInFigure(...)` unconditionally with whatever caption and role came back; there is no "empty caption means don't wrap" guard. markdown-format.ts:467-472 `buildFigureBlock` emits the block with the image alone when the caption is empty, and the existing suite already asserts that shape (src/tests/unit/markdown-format.test.ts:272-274: wrap with caption '   ' and role 'center' yields ":::figure{.center}
<token>
:::").

4. I executed the round trip rather than reasoning about it. Running `figureAtImage` (markdown-format.ts:434) via tsx against three docs, with the suite's own 16-hex media hash:
   - ":::figure{.wide}
<token>
:::"  -> {"imageFrom":17,"imageTo":65,"figure":{"from":0,"to":69,"caption":"","role":"wide"}}
   - ":::figure
<token>
:::"          -> {"imageFrom":10,"imageTo":58,"figure":{"from":0,"to":62,"caption":"","role":null}}
   - ":::figure{.wide}
<token>

A cap.
:::" -> figure.caption "A cap.", role "wide"
   In the first two, `figure` is non-null with `caption: ""`, so `figureLabel` reads "Edit the figure at the cursor" with no caption anywhere in the document. The second case is the sharper one: caption empty AND placement left at the Measure default still produces a figure and still flips the label.

5. Reproducible editor path: cursor on a bare image, press the button (reads "Wrap the image at the cursor in a figure"), choose Wide, leave the caption blank, apply. The button now reads "Edit the figure at the cursor", which the page says should not happen until there is a caption. The change makes the page more true, not merely tidier, because it replaces a wrong trigger with the actual one.

Caveat on the proposed wording, offered as a refinement rather than a dispute: "whether you gave it a caption, a placement, or both" still under-covers the measured second case, where the author gave neither and the label flipped anyway. A trigger phrased on the figure alone (roughly "once you've used it once, the image sits in a figure and the same button reads Edit the figure at the cursor") matches EditPage.svelte:832-838 exactly.

Severity is low, consistent with the raiser's own rank 8: the label an editor sees is still self-describing, so the wrong trigger misleads only a reader who is watching the tooltip to infer state.
```

**Revised finding:**

```text
The finding is confirmed as raised. The only adjustment is to its proposed fix, not to the defect: the replacement sentence should key on the image being in a figure at all, since a figure is created with neither a caption nor a non-default placement (verified: ":::figure
<token>
:::" returns figure non-null with caption "" and role null), which the proposed "a caption, a placement, or both" phrasing does not cover.
```


#### Rank 9 — `docs/editors/manage-the-media-library.md` — REFUTED

**Quoted:**

```text
The library accepts JPEG, PNG, WebP, and GIF pictures directly.
```

**Criterion:**

```text
AVIF is a first-class accepted type and is missing from an enumeration that add-an-image.md links to as the authority ("For which file types the editor accepts, see Manage the media library#accepted-image-types"). src/lib/media/config.ts:37 `DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']`; the sniffer recognizes the AVIF brands (media/sniff.ts:76-84) and media/sniff.ts:98-102 maps it to its own stored extension.
```

**Proposed change:**

```text
Add it: "The library accepts JPEG, PNG, WebP, GIF, and AVIF pictures directly."
```

**Kind:** factual

**Verifier evidence:**

```text
The quoted line is real and in context: docs/editors/manage-the-media-library.md:33, under "## Accepted image types" (line 31), followed at line 34 by "It also accepts HEIC, the format many phone cameras use, and converts it for you automatically."

The finding's source citations are accurate but exclusively server-side. src/lib/media/config.ts:37 does include 'image/avif' in DEFAULT_ALLOWED_TYPES; src/lib/media/sniff.ts:30,82 recognizes the 'avif'/'avis' ISO-BMFF brands; sniff.ts:100 maps image/avif to the 'avif' extension. The sole consumer of allowedTypes is src/lib/sveltekit/content-routes-media.ts:520.

The refutation is the client ingest path, which the finding never examined. Every editor upload runs through ingestFile BEFORE any request reaches that server check. Call sites: src/lib/components/CairnMediaLibrary.svelte:408 and :647 (the media library this very page documents), src/lib/components/MediaInsertPopover.svelte:232, src/lib/components/MediaHeroField.svelte:288. There is no other upload entry point and no bypass.

src/lib/components/client-ingest.ts ingestFile has exactly three accepting branches:
  - sniffed === 'image/gif' -> passthrough (dimensions from GIF header)
  - sniffed === 'image/jpeg' || 'image/png' || 'image/webp' -> passthrough
  - detectHeic(bytes) -> lazy heic-to decode, re-encoded to WebP
An AVIF sniffs to 'image/avif', matches none of the three (detectHeic at client-ingest.ts:28 is `sniffMediaType(bytes) === 'image/heic'`, false for AVIF), and falls through to `throw new IngestError('decode-unsupported')` at the function tail. The module's own doc comment at client-ingest.ts:285-288 states the taxonomy: "Web-native types (JPEG, PNG, WebP) pass through ... GIF passes through ... HEIC routes through the lazy-loaded heic-to decoder."

The page therefore enumerates the ingest tiers exactly: four accepted directly (JPEG, PNG, WebP, GIF), one converted (HEIC). It matches ingestFile branch for branch and is complete for its audience.

The proposed change would make the page LESS true. An editor who reads "accepts ... AVIF pictures directly" and drops an AVIF receives a decode-unsupported failure card (src/lib/components/media-upload-outcome.ts:53 maps unsupported_type -> 'decode-unsupported'). That trades an accurate statement for a tidier-looking false one.

The editor-facing scope is confirmed by the cross-reference the finding itself cites: docs/editors/add-an-image.md:32-33 reads "For which file types the editor accepts, see Manage the media library#accepted-image-types." The editor is the explicit subject, and AVIF is precisely what the editor cannot upload.

Test coverage corroborates the split: 'avif' appears in src/tests/unit/media-sniff.test.ts, media-seed.test.ts, media-store.test.ts and media-config.test.ts, and in no client-ingest test.
```

**Revised finding:**

```text
No docs defect exists on this page; the page is accurate as written and the proposed edit would introduce a false statement. What is genuinely there is a code-level inconsistency, out of scope for this docs gate: DEFAULT_ALLOWED_TYPES (src/lib/media/config.ts:37) permits image/avif, but no editor upload path can ever produce one, since ingestFile rejects AVIF as decode-unsupported. AVIF is reachable only through developer-side paths - the seeding assembler (src/lib/media-seed/assemble.ts:92) and delivery of already-stored objects (src/lib/sveltekit/media-route.ts:25 DELIVERY_EXTS). If anything should change, it is either the engine (add an AVIF passthrough branch to ingestFile, since AVIF is web-native and createImageBitmap decodes it in current browsers) or a note in the extend track about the server allow-list exceeding what the editor UI can submit. Neither belongs in docs/editors/manage-the-media-library.md.
```


#### Rank 10 — `docs/editors/write-in-the-editor.md` — CONFIRMED

**Quoted:**

```text
Placing your cursor inside a block you already inserted and selecting the pencil icon next to it reopens that same form so you can adjust it.
```

**Criterion:**

```text
The pencil control is a toolbar button in the Insert group, immediately after **Insert block** (EditPage.svelte:2063-2074, a `SquarePenIcon` whose label comes from `editBlockLabel`). Nothing renders beside a block in the text except the fold chevron in the gutter (editor-folding.ts:41-43), which the very next paragraph calls "the control in the margin", so "next to it" sends the reader to the margin control that only folds and unfolds.
```

**Proposed change:**

```text
Name its home: "Placing your cursor inside a block you already inserted and selecting the pencil button in the toolbar, beside **Insert block**, reopens that same form so you can adjust it."
```

**Kind:** procedural

**Verifier evidence:**

```text
Quote verified verbatim at docs/editors/write-in-the-editor.md:148-150 ("...selecting the pencil icon / next to it reopens that same form..."), in the Layout blocks section.

Control's real home: src/lib/components/EditPage.svelte:2040-2074. Inside the insertControls() snippet handed to EditorToolbar, the Insert block button (2046-2056, BlocksIcon, aria-label="Insert block") is immediately followed by the edit control (2063-2074, SquarePenIcon, aria-label/title = editBlockLabel). editBlockLabel is derived at 912-918 as "Edit the component at the cursor" / "Place the cursor in a component to edit it" / "This block can't be edited in the form. Edit it as markdown." It is a toolbar button in the Insert group. (editBlockUnavailable at 923 uses aria-disabled, 2066/2070, so the page's "grayed out" sentence is fine.)

What actually renders beside a block: a repo grep for pencil|SquarePen|square-pen outside tests returns only src/lib/components/admin-icons.ts:8 (an unrelated PencilIcon re-export) and the two EditPage.svelte lines above. The only per-block control near the text is the fold chevron gutter marker in src/lib/components/editor-folding.ts: CHEVRON_DOWN at 45, chevronSvg() 47-60, FoldMarker 424-465 (title "Fold this section" / "Unfold this section", click calls toggleFold), foldGutterColumn 470-490. The other in-document widget is MediaChipWidget (src/lib/components/editor-media.ts:58), unrelated to blocks.

Why the misreading is the likely one: the nearest antecedent of "it" is "a block you already inserted", and the very next paragraph (line 153) calls the gutter chevron "the control in the margin" — the only control that is next to a block, and it only folds. The page names button locations everywhere else (lines 106, 128, 183, 194, 202 say "the toolbar"), and the toolbar section's Insert group summary (68-69) lists "a set of ready-made blocks" without mentioning the edit control, so nothing earlier gives the reader the toolbar location.

The proposed change matches EditPage.svelte:2046-2074 exactly and removes the collision with line 153; it gives up nothing accurate.

Minor citation drift in the finding, not affecting the substance: the folding file is src/lib/components/editor-folding.ts (the finding wrote src/lib/editor/), and the chevron lines are 45-60 and 419-465 rather than 41-43.
```

**Revised finding:**

```text
Confirmed as raised. The only refinement: the finding's source path for the fold chevron should be src/lib/components/editor-folding.ts:45-60 and 419-465, not editor-folding.ts:41-43 under src/lib/editor/.
```


### `docs/extend` (18 findings, 2 verified)

18 findings.

**Coverage note (as reported by the sweep):**

```text
Full sweep, not a sample: all 31 pages in docs/extend (4,003 lines) read end to end, decomposed into roughly 280 checkable claims, each traced to a source line under src/, packages/, examples/showcase/, migrations/, CHANGELOG.md, or a recorded run under docs/internal/record/. Every numeric claim in the track was checked exact against its constant: the 15 field builders (fields.ts:147-180), 5 D1 tables across 4 migrations (migrations/*.sql), the 16-hex media hash prefix (media/naming.ts:75), the 10-minute token TTL / 30-day session / 60-second cooldown (auth/crypto.ts:59-65), the 24,000-character and 10-minute tidy limits (content-routes-tidy.ts:45, tidy-key-health.ts:19), the 8-digit code floor (factory.ts:355), the 16-character correlationId (factory.ts:584), the 3 capability levels, the 3 stability tiers (reference/README.md:21-31), the 8 vocabulary terms, and the 6 navLayout engine screens (admin-nav.ts:99). Every exported symbol, subpath, CLI flag, config key, log event, and binding name the track cites was resolved against the source; `npm run check:docs` (198 files, all links and anchors resolve) and `check:symbols` (74 files, no unresolved symbol) both pass on this tree, so the findings above are the semantic residue those greps structurally cannot reach. Four claims I could not verify against the tree and left standing, each flagged where it mattered: GitHub's 25-key cap and its at-least-one-key rule (vendor facts with no in-tree source, findings 15); Cloudflare's static-asset MIME re-derivation control experiment in wire-the-delivery-surface (finding 11 — the two headline values do trace to docs/superpowers/plans/2026-08-05-ai-posture.md:408-411, the control does not); SvelteKit's route-specificity precedence for a matched rest route over a plain catch-all (framework behavior, though the shape itself is verified in examples/showcase/src/params/md.ts and the paired route directory); and design-your-site's "about fourteen values" re-skin estimate, which is a bounded judgment rather than a countable constant and which I did not fire on.
```

#### Rank 1 — `docs/extend/build-a-site-by-hand.md` — CONFIRMED

**Quoted:**

```text
Restart the dev server, and visit `/2026/08/hello` (posts route by date under `routing: 'feed'`;
```

**Criterion:**

```text
src/lib/content/concepts.ts:66-68 (`defaultPermalink`: `id === 'pages' ? '/:slug' : `/${id}/:slug``) and :189-190 (`permalink: policy.permalink ?? defaultPermalink(id)`, `datePrefix: policy.datePrefix ?? 'day'`), with src/lib/content/ids.ts:44-58 (`slugFromId` strips the `day` prefix)
```

**Proposed change:**

```text
The Milestone 2 concept declares no `permalink` and no `datePrefix`, so the entry `2026-08-14-hello.md` resolves at `/posts/hello`, not `/2026/08/hello`: the default pattern is `/<concept id>/:slug` (only `pages` gets `/:slug`) and the default `datePrefix` of `day` strips the whole `2026-08-14-` stem. Change the sentence to "visit `/posts/hello` (the default permalink for a concept is `/<id>/:slug`, and a dated concept's filename date prefix is stripped from the slug)". A date-shaped URL needs an explicit `permalink: '/:year/:month/:slug'` on the concept, which this milestone does not declare.
```

**Kind:** procedural

**Verifier evidence:**

```text
Quote verified in context at docs/extend/build-a-site-by-hand.md:485 ("Restart the dev server, and visit `/2026/08/hello` (posts route by date under `routing: 'feed'`;"), the Milestone 3 success check for the entry created at line 160 (src/content/posts/2026-08-14-hello.md).

The Milestone 2 concept declares no URL policy: `grep -n "permalink" docs/extend/build-a-site-by-hand.md` returns zero hits, and the defineConcept block (lines 194-207) carries only dir/label/singular/routing/fields; site.config.yaml (lines 226-229) is siteName + description only. normalizeConcepts in this version takes the content record alone (src/lib/content/concepts.ts:135-137), so there is no YAML url-policy path.

EXECUTED the shipped code with the page's exact concept and filename (npx tsx, normalizeConcepts + entryIdentity):
  permalink pattern: /posts/:slug | datePrefix: day | dated: true
  resolved URL: { id: '2026-08-14-hello', slug: 'hello', date: '2026-08-14', permalink: '/posts/hello' }
The page directs the reader to a URL that does not exist; the generated route is /posts/hello.

Cited lines verified: src/lib/content/concepts.ts:65-67 (defaultPermalink: `id === 'pages' ? '/:slug' : `/${id}/:slug``), :189-190 (`permalink: policy.permalink ?? defaultPermalink(id)`, `datePrefix: policy.datePrefix ?? 'day'`), src/lib/content/ids.ts:44-58 (DATE_PREFIX_RE.day = /^\d{4}-\d{2}-\d{2}-/, stripping the full 2026-08-14- stem), src/lib/content/identity.ts:57-59 (slugFromId + resolvePermalink composition).

Beyond the finding: the parenthetical's causal claim is also false. ROUTING_SHORTHANDS.feed (src/lib/content/concepts.ts:17) is { routable: true, dated: true, inFeeds: true }; `dated` governs the filename date prefix and feed inclusion, never URL shape. The explanation must be dropped, not only the path. One nit on the proposed wording: /<id>/:slug is the default for every concept except `pages` (/:slug), and the replacement sentence should carry that exception.
```

**Revised finding:**

```text
The finding stands as raised, with one addition and one nit. Addition: the parenthetical's causal explanation ("posts route by date under `routing: 'feed'`") is independently false, since the `feed` shorthand sets dated/inFeeds and has no effect on URL shape, so the fix must replace the explanation as well as the path. Nit: the proposed replacement sentence should note that `/<id>/:slug` is the default for every concept except `pages`, which defaults to `/:slug`.
```


#### Rank 2 — `docs/extend/build-a-site-by-hand.md` — CONFIRMED

**Quoted:**

```text
export const ORIGIN = 'http://localhost:5173';
```

**Criterion:**

```text
src/lib/delivery/public-routes.ts:137-147 (`origin` is the base for `canonicalUrl = origin + entry.permalink` and for `resolveImageUrl(rawImage, origin)`); build-a-site-by-hand.md:453 sets `prerender = true` on the route that consumes it, and Milestones 4 and 5 deploy without ever revising the constant
```

**Proposed change:**

```text
Milestone 3 hard-codes the dev origin and no later milestone changes it, so the site deployed in Milestone 4 and 5 prerenders every canonical URL, `og:url`, and absolute image URL pointing at `http://localhost:5173`. Add a step in Milestone 4 (before `npm run build`) that replaces `ORIGIN` with the printed `workers.dev` URL, and note in Milestone 5 that it must match `PUBLIC_ORIGIN` in `wrangler.jsonc`.
```

**Kind:** procedural

**Verifier evidence:**

```text
Re-derived end to end; the finding survives.

1. Quote verified in context. docs/extend/build-a-site-by-hand.md:408 is `export const ORIGIN = 'http://localhost:5173';` inside Milestone 3's `src/lib/content.ts` block. `grep -n ORIGIN` on the page returns only 408, 450, 458, 567 — no milestone revises it.

2. Mechanism verified in source, not assumed. src/lib/delivery/public-routes.ts:139 `const canonicalUrl = origin + entry.permalink;` -> buildSeoMeta. src/lib/delivery/seo.ts:40 emits `{ property: 'og:url', content: input.canonicalUrl }`, :61 emits `{ rel: 'canonical', href: input.canonicalUrl }`, :76 and :86 put it in the JSON-LD `url`. src/lib/delivery/CairnHead.svelte:43-51 renders `seo.meta` and `seo.links` into `<svelte:head>`. The page wires exactly this at 450-462 (`origin: ORIGIN`) and renders `<CairnHead seo={data.seo} />` at ~470. `export const prerender = true;` confirmed at line 453, so the wrong origin is baked into static HTML rather than merely computed.

3. No later milestone corrects it. Milestone 4 (496-513) is `npm run build` + `npx wrangler deploy` with no edit and a success criterion of "the deployed URL serves your post". Milestone 5 (515-607) changes `backend`, `email`, and `wrangler.jsonc` (setting `PUBLIC_ORIGIN` to the workers.dev URL at :567), rebuilds and redeploys, and never mentions `ORIGIN`.

4. Corpus convention contradicts the page, which strengthens rather than excuses it. The sibling page docs/extend/wire-the-delivery-surface.md:31 uses `export const ORIGIN = 'https://your-domain.example';` and the engine's own reference site examples/showcase/src/chassis/content.ts:28 uses `'https://showcase.test'`. Both seed a production placeholder. build-a-site-by-hand.md is the only place in the tree that seeds the dev origin and then walks the reader through two deploys.

5. The proposed fix is feasible and makes the page more true, not merely tidier. The workers.dev URL is printed in Milestone 1 (page line 107, "wrangler deploy prints the live URL"), so it is available well before Milestone 4. The `PUBLIC_ORIGIN` cross-reference is also well-founded: src/lib/delivery/seo.ts:5 and src/lib/delivery/feeds.ts:4 both document these absolute URLs as "built from PUBLIC_ORIGIN", and docs/superpowers/specs/2026-05-30-cairn-public-delivery-design.md:295 annotates the delivery `siteUrl` as `PUBLIC_ORIGIN`, so two values that the design treats as one thing are left silently disagreeing.

One scoping correction to the finding's stated blast radius (does not change the verdict): the guide sets no `defaultImage` and its sample post has no `image` frontmatter (grep for `defaultImage|image:` on the page returns nothing), so `resolveImageUrl(rawImage, origin)` never fires here; feeds/sitemap/robots are explicitly deferred to wire-the-delivery-surface.md (page lines 486-490). The concrete damage on this walkthrough is the head SEO triple: `<link rel="canonical">`, `og:url`, and the JSON-LD `url`, all pointing at http://localhost:5173 on a live site.
```


#### Rank 3 — `docs/extend/data-tiers.md` — UNVERIFIED

**Quoted:**

```text
A site that declares an `assets` block on its adapter gets an R2 bucket for uploaded media, bound
```

**Criterion:**

```text
src/lib/content/types.ts:271-272 (`CairnAdapter` declares `media?: AssetConfig`) and src/lib/content/compose.ts:53 (`assets: adapter.media`, i.e. `assets` is the composed-runtime name, not the adapter member); docs/reference/core.md:235 documents the member as "`media` (adapter member)"
```

**Proposed change:**

```text
There is no `assets` key on `defineAdapter`; declaring one is a type error. Change to "A site that declares a `media` block on its adapter". Line 57 needs the same fix: "a site's `assets.variants`" becomes "a site's `media.variants`".
```

**Kind:** factual


#### Rank 4 — `docs/extend/debug-your-site.md` — UNVERIFIED

**Quoted:**

```text
The public route factory was built with media configured on (the adapter declares an `assets` block), but no `resolveMedia` function was ever wired into it.
```

**Criterion:**

```text
src/lib/content/types.ts:271-272 (`CairnAdapter.media?: AssetConfig`); the runtime member named `assets` is produced by `composeRuntime` (src/lib/content/compose.ts:53), not declared by the site
```

**Proposed change:**

```text
Replace "the adapter declares an `assets` block" with "the adapter declares a `media` block" in the `media.resolver_absent` row, so a reader chasing this event looks for the key that actually exists in their `cairn.config.ts`.
```

**Kind:** factual


#### Rank 5 — `docs/extend/debug-your-site.md` — UNVERIFIED

**Quoted:**

```text
For `rate_limit_failed`, fix the `key()` or `limit()` function named in the `createSectionAction` config.
```

**Criterion:**

```text
src/lib/sveltekit/section-action.ts:39-44 (`SectionActionConfig.rateLimit` carries exactly `resolve`, `key`, and `message`) and :217 (`limiter.limit(...)` is the resolved Cloudflare binding's own method, never a site-supplied config function)
```

**Proposed change:**

```text
`limit()` is not a member of the `createSectionAction` config. Rewrite as: "For `rate_limit_failed`, fix the `rateLimit.key()` function in the `createSectionAction` config, or the rate-limit binding whose own `limit()` call threw."
```

**Kind:** factual


#### Rank 6 — `docs/extend/announce-on-publish.md` — UNVERIFIED

**Quoted:**

```text
An entry counts as newly published when `after` carries a `publishedAt` stamp and its
```

**Criterion:**

```text
src/lib/delivery/manifest.ts:60-63 (`if (e.draft) return false;` runs first, before the stamp and prior-stamp tests), and its own doc comment at :43-46 ("a drafted entry CAN carry a stamp forward … the draft check below is what actually excludes a currently unpublished entry rather than the stamp check alone")
```

**Proposed change:**

```text
The stated rule is missing the first condition, so it gives the wrong answer for a stamped-but-drafted entry with no counterpart in `before` (the page's rule includes it; the code excludes it). Add the draft clause: "An entry counts as newly published when it is not a draft in `after`, `after` carries a `publishedAt` stamp, and its same-identity counterpart in `before` was either absent or itself unstamped."
```

**Kind:** factual


#### Rank 7 — `docs/extend/what-the-scaffold-wrote.md` — UNVERIFIED

**Quoted:**

```text
| `wrangler.jsonc` | The Worker's bindings: `AUTH_DB` (D1), `EMAIL` (Email Sending), `MEDIA_BUCKET` (R2), and `PUBLIC_ORIGIN`. `create-cairn-site` fills the ids in; see [Before you start](../admin/before-you-start.md) for what each binding costs. |
```

**Criterion:**

```text
examples/showcase/wrangler.jsonc:36-44 declares a second D1 binding, `APP_DB` (`migrations_dir: "migrations-app"`), outside the `cairn-template:exclude-start`/`-end` block at :45-56 that removes only `MEMBER_DB`; examples/showcase/.cairn-template.json excludes `migrations-members` but not `migrations-app`, so both ship in the baked tree
```

**Proposed change:**

```text
The scaffolded tree carries a second database the page never names, and the `migrations/` row ("The auth store's schema") likewise omits the `migrations-app/` directory beside it. Add `APP_DB` (D1, the signups screen's own database, its own `migrations-app/` directory) to the bindings list, and name `migrations-app/` in the `migrations/` row, since a site owner has to apply its migrations separately.
```

**Kind:** factual


#### Rank 8 — `docs/extend/what-the-scaffold-wrote.md` — UNVERIFIED

**Quoted:**

```text
that tree carries only for the engine's own development: its Playwright suite, its design-review
```

**Criterion:**

```text
examples/showcase/.cairn-template.json (`exclude` lists `src/routes/test`, `src/members`, `src/routes/members`, `migrations-members`, `e2e`, `playwright.config.ts`, `.claude`, `scripts`, `README.md`) and packages/create-cairn-site/scripts/bake-template.mjs:22-23 (`PRUNED_SCRIPTS`/`PRUNED_DEV_DEPENDENCIES`), neither of which covers `examples/showcase/src/routes/probe-craft/`, whose own `+page.svelte` header declares it "the craft chapter's acceptance fixture … This route exists only to prove the craft chapter's acceptance test"
```

**Proposed change:**

```text
The design-review tooling is only half pruned: the `design:probe` script and the Playwright dev dependencies go, but the `/probe-craft` route itself ships in the scaffolded tree and is absent from the Public routes table. Either add a `probe-craft/` row to the Public routes table ("an engine acceptance fixture; safe to delete") or, better, file the bake gap so the route joins the exclusion manifest and the sentence stays true as written.
```

**Kind:** factual


#### Rank 9 — `docs/extend/configure-rendering.md` — UNVERIFIED

**Quoted:**

```text
the rest of the leaf types; never `object`, `array`, `reference`, or `image`), validated by the
```

**Criterion:**

```text
src/lib/render/registry.ts:237-244 (`checkComponentAttributes` throws for any type outside `ATTRIBUTE_TYPES`, whose error message enumerates the permitted set: "text, textarea, number, select, url, email, date, datetime, boolean, or icon")
```

**Proposed change:**

```text
`multiselect` is a leaf type but is also rejected, so "the rest of the leaf types" invites a `fields.multiselect` attribute that throws at module load. Replace the parenthetical with the positive list the code enforces: "(`text`, `textarea`, `number`, `select`, `url`, `email`, `date`, `datetime`, `boolean`, and `icon` only; `multiselect`, `object`, `array`, `reference`, and `image` throw at declaration)".
```

**Kind:** factual


#### Rank 10 — `docs/extend/build-a-site-by-hand.md` — UNVERIFIED

**Quoted:**

```text
everything through Milestone 3; Milestone 5 needs Workers Paid, named at the point it matters).
```

**Criterion:**

```text
The string "Paid" appears nowhere else in this page, and nowhere in docs/extend/add-cairn-to-a-sveltekit-app.md, the page Milestone 5 delegates its whole account setup to (build-a-site-by-hand.md:520-525)
```

**Proposed change:**

```text
The intro promises the cost is named where it is incurred, and it never is. Add one sentence at the top of Milestone 5 stating that Email Sending to arbitrary recipients requires the Workers Paid plan, with the same link the admin track uses, so a reader who skipped the intro meets the cost before running the step that needs it.
```

**Kind:** procedural


#### Rank 11 — `docs/extend/wire-the-delivery-surface.md` — UNVERIFIED

**Quoted:**

```text
route's own header to a deliberately different value and rebuilding produced the identical
```

**Criterion:**

```text
docs/internal/record/2026-08-14-pass-d-target-manifest.md:453-462 ("No recorded run in this repo holds a measurement of what actually ships for `.md` under `wrangler dev` or a real deploy … a number nobody re-measured does not ship"); the only measurement in the tree is docs/superpowers/plans/2026-08-05-ai-posture.md:408-411, which records the `wrangler dev` and `vite preview` values but not this control experiment or the `_headers` claim at line 116
```

**Proposed change:**

```text
The two measured values (the `wrangler dev` charset, the `vite preview` absence) trace to a recorded run; the control experiment and the claim that `@sveltejs/adapter-cloudflare` does not capture Response headers into `_headers` do not. Either bank the control run under `docs/internal/record/` and cite it, or cut the two unrecorded sentences and keep the conclusion, which the recorded measurement already supports on its own.
```

**Kind:** factual


#### Rank 12 — `docs/extend/define-an-adapter-and-schema.md` — UNVERIFIED

**Quoted:**

```text
depth, including the one-level nesting cap on `object` and `array` fields.
```

**Criterion:**

```text
docs/extend/content-model.md carries no mention of nesting, containers, or a depth cap anywhere in its 73 lines; the cap itself is real, at src/lib/content/fieldset.ts:364-380 ("containers nest one level only")
```

**Proposed change:**

```text
The pointer promises content the target page does not carry, so a reader who follows it finds nothing. Either add a two-sentence nesting-cap paragraph to content-model.md's "Concepts are fixed" section (an `object` or `array` holds leaves one level deep; a deeper nesting, a nested `reference`, or a dotted key throws at declaration), or drop the "including" clause and point at [Core](../reference/core.md#fields) for the cap instead.
```

**Kind:** coherence


#### Rank 13 — `docs/extend/choose-an-ai-posture.md` — UNVERIFIED

**Quoted:**

```text
search=yes, ai-train=yes` and emits no `Disallow` lines at all, since no `robots.txt` directive
```

**Criterion:**

```text
src/lib/delivery/robots.ts:40 (`for (const path of opts.disallow ?? []) lines.push(`Disallow: ${path}`);` runs unconditionally, before and independent of the posture branch at :41-43), contradicted by this page's own example at line 31, which passes `disallow: ['/admin']` alongside `posture`
```

**Proposed change:**

```text
A site's own `disallow` paths are still emitted under `'invite'`. Narrow the claim to the posture's own contribution: "`'invite'` adds `Content-Signal: search=yes, ai-train=yes` and no crawler-specific `Disallow` group of its own (your `disallow` paths are unaffected), since no `robots.txt` directive grants access".
```

**Kind:** factual


#### Rank 14 — `docs/extend/README.md` — UNVERIFIED

**Quoted:**

```text
types moved twice, at `0.86.0` and again at `0.94.0`, both inside the Extension API tier).
```

**Criterion:**

```text
CHANGELOG.md:2087-2098 (0.86.0 *introduced* `navLayout` as a new adapter member; the breaking changes that release were `AdminShellData`'s nav fields at :2109-2115 and `navFilter`'s widened types at :2116-2124), against CHANGELOG.md:749-761 (0.94.0, where `navLayout`'s own types were renamed and `adminNav` removed)
```

**Proposed change:**

```text
`navLayout` did not exist before 0.86.0, so its own types could not have moved there. The underlying point still holds; make it accurate: "the admin nav seam broke twice, at `0.86.0` (`AdminShellData`'s nav fields consolidated, `navFilter`'s types widened) and again at `0.94.0` (`navLayout`'s own types renamed), both inside the Extension API tier". docs/extend/migration-notes.md:65 ("Its types were renamed again in 0.94.0") carries the same implication and needs "again" dropped.
```

**Kind:** factual


#### Rank 15 — `docs/extend/rotate-the-github-app-key.md` — UNVERIFIED

**Quoted:**

```text
A GitHub App can hold more than one private key at once, up to twenty-five. Generating a new key
```

**Criterion:**

```text
docs/internal/docs-register.md's link-don't-restate rule for vendor specifics (the same rule CHANGELOG.md and docs/reference/supported-toolchain.md follow for SvelteKit's `checkOrigin`); no source file, recorded run, or gated reference page in this tree carries the 25-key cap, nor step 6's "GitHub requires at least one key to exist"
```

**Proposed change:**

```text
Both numbers are copied vendor specifics with nothing in the tree behind them, and the page already links GitHub's own managing-private-keys page two lines later. Cut the cap to the load-bearing fact and let the link carry the limit: "A GitHub App can hold more than one private key at once (GitHub's own page states the current cap)." Apply the same treatment to step 6's at-least-one-key assertion, or drop it, since the rotation order does not depend on it.
```

**Kind:** factual


#### Rank 16 — `docs/extend/data-tiers.md` — UNVERIFIED

**Quoted:**

```text
keys by content hash rather than by concept and id, and carries exactly what the bytes themselves
```

**Criterion:**

```text
The same claim already appears verbatim in this page at lines 53-55 ("the media manifest, keyed by a 16-hex hash prefix … Each manifest row carries what the bytes themselves can't: a display name, alt text, the original filename, and known pixel dimensions"), ten lines earlier in the same section
```

**Proposed change:**

```text
The final two sentences of the R2 section restate the section's own third sentence almost word for word. Delete lines 63-65 from "The media manifest keys by content hash" to the end of the paragraph; the section loses nothing, since the keying and the row contents are both already stated above.
```

**Kind:** coherence


#### Rank 17 — `docs/extend/enable-tidy.md` — UNVERIFIED

**Quoted:**

```text
Every convention below defaults off; declaring nothing beyond `enabled: true` runs the objective
```

**Criterion:**

```text
src/lib/nav/site-config.ts:175 (`return { fixes: true, enDashRanges: false, smartQuotes: false, brandCaps: false };`), and the first row of this page's own table two lines later ("`fixes` | boolean, default `true`")
```

**Proposed change:**

```text
The sentence is contradicted by the table it introduces and by its own second clause. Rewrite as: "`fixes` defaults on and every other convention below defaults off, so declaring nothing beyond `enabled: true` runs the objective fixes alone."
```

**Kind:** coherence


#### Rank 18 — `docs/extend/add-a-second-audience.md` — UNVERIFIED

**Quoted:**

```text
`createAuthChannel` builds request, confirm, and logout actions over an 8-digit code, delivered
```

**Criterion:**

```text
src/lib/auth-channel/factory.ts:355 (`codeLength: resolveLimit('codeLength', overrides.codeLength, 8, { min: 8, max: 10 })`); docs/reference/auth-channel.md:4 states it as "an 8-digit-by-default OTP code"
```

**Proposed change:**

```text
Eight is the default, not the fixed length; the factory admits 8 through 10. Change to "over an 8-digit code by default (configurable up to 10)", matching the reference page's own wording.
```

**Kind:** factual


### `docs/reference` (13 findings, 0 verified)

13 findings.

**Coverage note (as reported by the sweep):**

```text
All 24 pages in docs/reference were opened; nothing was sampled away. Roughly 280 discrete claims traced to ground truth. Depth was uneven by design: the twelve small-to-mid pages (README, supported-toolchain, render, vite, ambient, cli-cairn-manifest, cli-cairn-media-seed, auth-store, auth-crypto, media, islands, cloudflare, delivery, admin-grammar-tokens, log-events, doctor, cairn-audit, admin-routes, auth-channel) were decomposed claim-by-claim and each claim traced to a source line; the five large pages (sveltekit 1981 lines, components 784, admin-toolkit 858, delivery-data 722, core 1094) were traced claim-by-claim on their structural, numeric, and config-key claims and read at spot-check depth on their per-export prose. Exact numeric checks that passed, listed so they are not re-run: the 18 grammar tokens and their values against src/lib/components/cairn-admin.css:57-77; the 11 role utilities + 2 container roles = 13; the 5 ratified `type-scale` suppressions in src/lib (3 wordmark, 2 editor); doctor's 19 default + 2 opt-in checks; cairn-audit's 9 static + 14 rendered = 23 rules, 6 default rendered pages, 12 norms roles, the 23.984375 touch-target floor, the "8 of the 10 errors" and "24 false errors of 40" figures (touch-targets.ts:49, chip-ground-collision.ts:245); every auth-channel default and clamp (factory.ts:355-363), the 254/300/32-byte/schema-version-"1"/16-hex-correlationId values; the audit-sink truncation set 320/100/100/200/500; preview TTL default 7 days, floor 1 minute, ceiling 30 days; media defaults (/media, 25 MB, thumb/inline/card/hero, transformations false); all five admin-toolkit formatter defaults; the 74-name log-event vocabulary, which matches src/lib/log/events.ts exactly with no name in either direction unmatched; the full 30-action `createCairnAdmin` vocabulary and its `authedViews`/`anyView` lists; every peer range and proven-against version in supported-toolchain against package.json and examples/showcase/package-lock.json. A mechanical identifier sweep of every backticked symbol on the six largest pages against src/lib resolved every name, so the hallucinated-symbol class is clean. Left unverified, with reasons: (a) the upstream claims in supported-toolchain — SvelteKit deprecated `csrf.checkOrigin` in 2.61, has not removed it, and that a scheduled routine watches kit#15992 — no tree evidence exists for any of the three and I could not fetch upstream; (b) the vendor facts in cloudflare.md — Turnstile's roughly 300-second single-use window and the documented 2048-character token format — the constants match the code (turnstile.ts:10) but the Cloudflare-side facts they encode are unverifiable here; (c) the `attw` structural-limitation reasoning in supported-toolchain ("svelte-package ships `.svelte` and `.css` re-export specifiers that `attw`'s resolver cannot follow") — I confirmed the three muted rules match package.json:37 but did not run `attw`; (d) the two design-token contrast ratios quoted in cairn-audit's norms example (1.11/1.19 light, 1.43/1.20 dark) — these come from a rendered browser measurement I could not reproduce read-only; (e) rendered-mode behavior generally, since running it needs a live server and Playwright, which the read-only constraint forbids.
```

#### Rank 1 — `docs/reference/core.md` — UNVERIFIED

**Quoted:**

```text
declare function cardShell(classes: string[], body: ElementContent[]): Element;
```

**Criterion:**

```text
src/lib/index.ts:102-104 — "The component-authoring helpers (iconSpan, cardShell, headRow, isElement, strAttr) live on the @glw907/cairn-cms/render subpath, not the root barrel." The page's own charter (docs/reference/README.md:3) is "One page per package export subpath", and core.md's opening import example is `from '@glw907/cairn-cms'`. Extender profile success criterion: "every documented snippet typechecks against the built package."
```

**Proposed change:**

```text
Delete the `iconSpan`, `cardShell`, and `headRow` declarations from core.md's "Component-author helpers" section, keeping only `glyph` (the one of the four the root barrel actually exports, src/lib/index.ts:100). Replace the removed three with one sentence pointing at [Render authoring (`/render`)](./render.md), which already documents all three with correct signatures, and change the worked `alert` snippet's implied import to match the showcase's real one (`import { cardShell, headRow, strAttr } from '@glw907/cairn-cms/render';`, examples/showcase/src/theme/cairn.config.ts:4).
```

**Kind:** procedural


#### Rank 2 — `docs/reference/sveltekit.md` — UNVERIFIED

**Quoted:**

```text
`deps.branding` defaults from the runtime's `siteName` and `sender`, so most sites pass no deps.
```

**Criterion:**

```text
src/lib/sveltekit/cairn-admin.ts:34-62 — `CairnAdminOptions` carries `auth`, `tidy`, `navFilter`, `attention`, `preview` and no top-level `branding`; line 95 reads `deps.auth?.branding ?? {...}`. docs/reference/admin-routes.md:97 states the correct path (`{ auth: { branding?, send? }, ... }`), so the two reference pages disagree.
```

**Proposed change:**

```text
Change to "`deps.auth.branding` defaults from the runtime's `siteName` and `sender`, so most sites pass no deps."
```

**Kind:** factual


#### Rank 3 — `docs/reference/core.md` — UNVERIFIED

**Quoted:**

```text
An `object`, `array`, `reference`, or `image` attribute throws at declaration.
```

**Criterion:**

```text
src/lib/render/registry.ts:234 — `ATTRIBUTE_TYPES = new Set(['text','textarea','number','select','url','email','date','datetime','boolean','icon'])`; line 239-242 throws for any type outside that set. `multiselect` is outside it, so it also throws, but it appears in neither the allowed list two sentences earlier nor this throwing list, leaving one of the fifteen `FieldDescriptor` arms unaccounted for on a page that presents both lists as exhaustive.
```

**Proposed change:**

```text
Change to "An `object`, `array`, `multiselect`, `reference`, or `image` attribute throws at declaration."
```

**Kind:** factual


#### Rank 4 — `docs/reference/core.md` — UNVERIFIED

**Quoted:**

```text
The adapter has six groups: `content`, `backend`, `email`, `rendering`, `media`, and `editor`.
```

**Criterion:**

```text
src/lib/content/types.ts:230-300 — `CairnAdapter` declares nine top-level members: `content`, `roles`, `access`, `backend`, `email`, `rendering`, `media`, `aiPosture`, `editor`. All three omitted members are documented further down this same page (`defineRoles`, `defineAccess`, and the `AiPosture` types row), so the count contradicts the page's own body.
```

**Proposed change:**

```text
Change to "The adapter has nine members: `content`, `roles`, `access`, `backend`, `email`, `rendering`, `media`, `aiPosture`, and `editor`," or drop the count and name the required four (`content`, `backend`, `email`, `rendering`) against the five optional ones.
```

**Kind:** factual


#### Rank 5 — `docs/reference/auth-crypto.md` — UNVERIFIED

**Quoted:**

```text
and it compares UTF-16 encoded bytes, so two distinct strings that differ only in a lone (unpaired) surrogate collapse to the same replacement-character byte sequence and compare equal.
```

**Criterion:**

```text
src/lib/auth/crypto.ts:112-113 — `tokensMatch` compares `new TextEncoder().encode(a)` against `new TextEncoder().encode(b)`; `TextEncoder` emits UTF-8, never UTF-16. The source's own doc comment says so: "`TextEncoder` maps an unpaired surrogate to the replacement character." The stated mechanism is also self-contradictory, since a UTF-16 encoding would preserve the lone surrogate's code unit rather than replacing it.
```

**Proposed change:**

```text
Change "UTF-16 encoded bytes" to "UTF-8 encoded bytes (`TextEncoder`)"; the rest of the sentence is correct as written.
```

**Kind:** factual


#### Rank 6 — `docs/reference/admin-routes.md` — UNVERIFIED

**Quoted:**

```text
| `/admin` | index | Redirects to the first concept's list. |
```

**Criterion:**

```text
src/lib/sveltekit/content-routes-core.ts:707-722 — `indexLoad` redirects to the role's declared `home` when one exists (303), otherwise redirects an owner- or editor-capability session to the first concept **the session can reach** (307, not the site-wide first), and returns the `'welcome'` view for a none-capability role. docs/reference/sveltekit.md:144-146 states all three branches correctly, so this table row contradicts the other reference page.
```

**Proposed change:**

```text
Change the Notes cell to "Role-aware: a role with a declared `home` redirects there; absent a `home`, an owner- or editor-capability role redirects to the first concept that session can reach; a none-capability role renders the `welcome` view."
```

**Kind:** factual


#### Rank 7 — `docs/reference/cairn-audit.md` — UNVERIFIED

**Quoted:**

```text
A green run means these eleven questions came back clean. It isn't an accessibility result.
```

**Criterion:**

```text
src/lib/audit/rules/rendered/index.ts:36-53 — `renderedRules()` returns fourteen rules, and the page's own two tables directly above enumerate five error-tier plus nine advisory. Eleven matches no count on the shipping tree (not 9 static, 14 rendered, 23 total, 5 error, or 9 advisory); it is the pre-`form-font-parity`/`field-edge-alignment`/`container-inset-asymmetry` figure.
```

**Proposed change:**

```text
Change "these eleven questions" to "these fourteen questions", matching the rule tables immediately above.
```

**Kind:** factual


#### Rank 8 — `docs/reference/admin-grammar-tokens.md` — UNVERIFIED

**Quoted:**

```text
The acceptance test for a re-tuned palette is a clean consumer-side rendered audit in both themes, once `cairn-audit` ships.
```

**Criterion:**

```text
package.json `bin` declares `cairn-audit: ./dist/audit/bin.js`, and docs/reference/cairn-audit.md:3 states "The package ships it in its `bin` field." Rendered mode (`npx cairn-audit --rendered`) already runs every configured page under both themes (docs/reference/cairn-audit.md:151). This same page's next section already speaks of the tool in the present tense: "`cairn-audit` reports the total" (line 144), so the future tense is stale within one page.
```

**Proposed change:**

```text
Change to "The acceptance test for a re-tuned palette is a clean consumer-side `npx cairn-audit --rendered` run, which renders every configured page under both themes."
```

**Kind:** factual


#### Rank 9 — `docs/reference/admin-routes.md` — UNVERIFIED

**Quoted:**

```text
A cairn site mounts the whole `/admin` surface with one catch-all route pair plus one server composer.
```

**Criterion:**

```text
src/lib/doctor/checks-local.ts:256-266 — "The candidate files of the four-file /admin mount", listing `src/routes/admin/+layout.server.ts`, `+layout.svelte`, `admin/[...path]/+page.server.ts`, `+page.svelte`; docs/reference/doctor.md:87 calls it "The four-file `/admin` mount". This page's own body then supplies the shell layout pair the opening sentence does not count, and docs/reference/README.md:35 compounds it with "the two-file catch-all mount".
```

**Proposed change:**

```text
Change to "A cairn site mounts the whole `/admin` surface with two route pairs, the catch-all and the shared shell layout, plus one server composer," and change the README index line to "the four-file admin mount and the composer a site copies" so the page, the README, and `cairn-doctor` all state one count.
```

**Kind:** coherence


#### Rank 10 — `docs/reference/core.md` — UNVERIFIED

**Quoted:**

```text
| `AssetConfig` | Extension API | `interface AssetConfig` | A site's media configuration: the R2 bucket binding, the delivery base and URL form, the upload limits, and the named Cloudflare Images variant presets. Omitting it leaves media off. See the `assets` adapter member above. |
```

**Criterion:**

```text
src/lib/content/types.ts:272 — the adapter member is `media?: AssetConfig`; there is no `assets` key on `CairnAdapter`. This page's own heading is "#### `media` (adapter member)" and the `VariantSpec` row two lines below links it correctly as `#media-adapter-member`.
```

**Proposed change:**

```text
Change "See the `assets` adapter member above" to "See the [`media` adapter member](#media-adapter-member) above."
```

**Kind:** factual


#### Rank 11 — `docs/reference/core.md` — UNVERIFIED

**Quoted:**

```text
declare function headRow(title: ElementContent[], icon?: Element): Element;
```

**Criterion:**

```text
src/lib/render/rehype-dispatch.ts:48 — `export function headRow(title: ElementContent[], icon?: Element, level: number = 2): Element`. The third parameter is absent from this declaration, and docs/reference/render.md:19 documents it ("`headRow(title, icon?, level?)` ... the heading level defaults to 2"), so the two reference pages carry different signatures for one function.
```

**Proposed change:**

```text
If the block survives finding 1's relocation, restore the third parameter: `declare function headRow(title: ElementContent[], icon?: Element, level?: number): Element;` and note the default of 2. Otherwise delete the line with the rest of the misplaced block.
```

**Kind:** factual


#### Rank 12 — `docs/reference/admin-toolkit.md` — UNVERIFIED

**Quoted:**

```text
The **field** primitives (`FieldLabel`, `TextInput`, `SelectInput`) render one labeled control in the admin's label and control rhythm;
```

**Criterion:**

```text
src/lib/admin-toolkit/index.ts:3-5 — "the FIELD primitives (`FieldLabel`, `FieldRow`, `TextInput`, `SelectInput`)", and the barrel exports `FieldRow` at line 57. This page's own Fields section (line 148-149) names four: "`TextInput`, `SelectInput`, `FieldLabel`, and `FieldRow`", so the opening tier definition disagrees with the section that expands it.
```

**Proposed change:**

```text
Change to "The **field** primitives (`FieldLabel`, `FieldRow`, `TextInput`, `SelectInput`)".
```

**Kind:** coherence


#### Rank 13 — `docs/reference/vite.md` — UNVERIFIED

**Quoted:**

```text
The showcase wires it in its `vite.config.ts`:
```

**Criterion:**

```text
examples/showcase/vite.config.ts:38-46 — the real call declares three concepts (`posts`, `pages`, `fragments`), and the plugin array also carries `devBuildDefine()` and `tailwindcss()` ahead of `sveltekit()`. The snippet that follows this sentence shows two concepts and two plugins, so a reader who opens the named file finds different content than the page attributes to it.
```

**Proposed change:**

```text
Either add the `fragments: '/src/content/fragments/*.md'` entry so the `content` map matches the file, or reframe the lead-in as "A minimal wiring, after `sveltekit()`:" and drop the attribution to the showcase's actual config.
```

**Kind:** factual


### Stage 2: the blind persona walks

All 33 walk findings are UNVERIFIED; the verify stage's cap drew only from the claims sweeps
(see Coverage above). Each walk's own completion state and stop point is repeated here from the
headline for co-location with its findings.

### `docs/admin` walk (6 findings)

**Completed:** false

**Stopped at:**

```text
is-it-working.md, at "Running the check". I ran `npx cairn-doctor` from my site directory and the page told me the Cloudflare, D1, and GitHub App checks would skip because their credentials live in my deployed Worker rather than my terminal, and that a skip is not a pass. No page in the track tells me how to make those checks actually run, so I could not carry out the third part of my goal, verifying the site is healthy. Parts one, two, and four (create the site, get signed in, recover an interrupted step) I would have completed, with the guesses below.
```

6 findings, all UNVERIFIED (the verify stage drew only from the claims sweeps).

**Coverage note:**

```text
Read all eight docs/admin pages in the order the track's README claims: README, before-you-start, create-your-site, own-your-domain, is-it-working, setup-recovery, invite-editors, troubleshooting. I also followed one out-of-track link, docs/reference/doctor.md, because is-it-working.md offers it as the full command reference; it names the credential environment variables but not how an admin obtains or sets them, so it does not close the rank-1 gap. Goal coverage: create a site from nothing, reached but with the rank-2 account guess; get signed in, fully covered by create-your-site.md's sign-in section and the --sign-in command, no guesses; verify it is healthy, not reached, the walk stopped here; recover a setup step that failed partway, setup-recovery.md's four tables covered every branch I could invent and I found no guess in it, so I judge that part completable had I gotten there. Nowhere did a page assume a state an earlier page had not produced; the track's ordering claim holds. Per the walk rules I recorded no opinions about prose clarity.
```

#### Rank 1 — `docs/admin/is-it-working.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
A skip there isn't a pass; it's the check telling you it had nothing to check.
```

**What the walker had to guess:**

```text
How to make the skipped checks run, or whether my site is healthy without them. The page tells me the GitHub App, Cloudflare, and D1 checks need a value like my Cloudflare API token or my GitHub App's private key, that on a create-cairn-site site those live in the deployed Worker's secrets and not in my terminal, and that a skip is not a pass. It never closes the loop. On the default path I set up, that leaves the auth store, the sending domain, HTTPS, HSTS, and the GitHub App all unverified, which is most of the blockers listed on this very page. I had to guess whether skipped means fine. The linked reference page (reference/doctor.md) names environment variables like CLOUDFLARE_API_TOKEN, but no page tells a non-developer where to obtain that value now, or how to put it into a shell, so following the link does not rescue the walk.
```

**Proposed change:**

```text
Add a short section to is-it-working.md, right after the skip paragraph, titled something like "Making the skipped checks run". State plainly either (a) the exact command that supplies the token for one run, and where to get the token (a fresh create-token page, or the one already pasted during the domain step, saying whether it was saved anywhere I can retrieve), or (b) that these checks cannot run on a create-cairn-site site at all, and name the substitutes that cover the same ground for an admin (`--probe`, `--send-test <address>`, and a real editor sign-in). Whichever is true, say which checks skip by name so I can tell a skipped-because-no-credential line from a skipped-because-nothing-to-check line.
```


#### Rank 2 — `docs/admin/create-your-site.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
You need a computer with [Node.js](https://nodejs.org) 22 or later installed, and a terminal. Nothing else.
```

**What the walker had to guess:**

```text
Whether I must already have a GitHub account and a Cloudflare account before running the command, and what to do if I have neither. My goal was to create a site from nothing. This page says the prerequisites are Node and a terminal and nothing else, then later says the tool "signs you in to GitHub" and "signs in to Cloudflare (a third browser trip, only if you aren't signed in already)", which presumes both accounts exist. before-you-start.md lists "A Cloudflare account" among the five things I will end up owning, which reads as though the tool creates one for me. I had to guess that the browser trips would let me sign up on the spot, and I had to guess that a Cloudflare account is free to open.
```

**Proposed change:**

```text
In "Before you run it", name both accounts as prerequisites alongside Node: a GitHub account and a Cloudflare account, both free to create, with sign-up links, and say explicitly that the tool signs in to accounts you already have rather than creating them. Also reword before-you-start.md's owning list so "A Cloudflare account" does not imply the tool provisions the account itself.
```


#### Rank 3 — `docs/admin/before-you-start.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
The moment a second person needs their own sign-in, an editor, a co-owner, anyone, your site needs to send that person a real email, and sending email is what the $5-a-month Workers Paid plan buys.
```

**What the walker had to guess:**

```text
Whether I can invite a second person without buying a domain. The cost section frames the domain as optional ("A payment method, only if you connect your own domain") and frames the second-person boundary as purely the $5 plan. But invite-editors.md says adding anyone "needs Workers Paid turned on and your sending domain onboarded", and the only page that onboards a sending domain is own-your-domain.md, which onboards `yourdomain` and opens by saying I need a domain already registered. Nothing states that sign-in email requires a domain of my own, so on the workers.dev address I would have paid the $5, gone to /admin/editors, added someone, and only then discovered they can never receive a link. I had to guess whether the workers.dev address can send mail.
```

**Proposed change:**

```text
State the dependency in the free-until boundary itself: a second person signing in requires both the Workers Paid plan and a domain of your own, because sign-in mail sends from your domain and a workers.dev address cannot send. Correct the cost list so the domain is not described as needed "only if" you want one, and repeat the same sentence in invite-editors.md's "Before you start".
```


#### Rank 4 — `docs/admin/before-you-start.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
**A Cloudflare API token you create yourself, at no cost, but read every row before you save it.** The tool opens Cloudflare's own "create token" page with the permissions it needs already selected, and asks you to paste the finished token back.
```

**What the walker had to guess:**

```text
When in the sequence I would be asked for this token. This is listed as one of "Three things stand between you and a finished setup", so I expected it during my first run. create-your-site.md never mentions a token, and its "Browser moments, in order" list (GitHub App, install, Cloudflare sign-in, sign-in page) contains no create-token page. The token only actually appears in own-your-domain.md, and there are two different tokens there with different permission counts. I had to guess that the first run needs no token at all, and I had to guess whether the token I paste for the domain step is the same one the doctor later wants.
```

**Proposed change:**

```text
In before-you-start.md's cost item 3, say where the token is asked for: not during the first site creation, but at the domain step and again, as a second wider token, at the Workers Builds step. One clause pointing at own-your-domain.md fixes the sequencing expectation.
```


#### Rank 5 — `docs/admin/is-it-working.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
**Act:** onboard the sending domain with `npx wrangler email sending enable <domain>`, then redeploy with `npx wrangler deploy`.
```

**What the walker had to guess:**

```text
Whether this is mine to do, where to run it, and whether I am authorized to run it. This is marked **Act**, which the page uses for things I do myself, but before-you-start.md classifies wrangler as a developer task in so many words ("This is a terminal-and-`wrangler` task"). No page in the track introduces wrangler, says to run it from my site's directory, or says whether the Cloudflare sign-in that happened during create-cairn-site still authorizes it. I had to guess on all three, and a wrong guess here means a failed deploy against a live site. The same question arises for `npx wrangler deploy` under `config.observability-off` and for `npx wrangler tail` in troubleshooting.md.
```

**Proposed change:**

```text
Either reclassify these wrangler steps as "Ask a developer", matching before-you-start.md, or introduce wrangler once in is-it-working.md the way `cairn-doctor` is introduced: run it from your site's directory, it uses the same Cloudflare sign-in the setup tool made, and it is safe to re-run. Then remove the contradicting sentence in before-you-start.md, or narrow it to key rotation specifically.
```


#### Rank 6 — `docs/admin/before-you-start.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
Everything above, you do yourself, with no code. A few things genuinely need someone who can write and ship code:
```

**What the walker had to guess:**

```text
Whether I need a developer on standby for my default site. This page names three developer tasks (rotate the key, upgrade the engine, add functionality). is-it-working.md then routes nine further conditions to a developer, including missing bindings, observability, the CSRF handoff, PUBLIC_ORIGIN, site.config.yaml, dependency floors, role wiring, and the admin mount. I had to guess whether a site built by create-cairn-site can even produce those failures, or whether they only appear on a hand-built or customized site, and therefore whether I can run this site alone as the page promises.
```

**Proposed change:**

```text
Add one sentence to before-you-start.md's "What needs a developer" saying that a site created by create-cairn-site ships already wired for all of these, and that the developer-routed checks in is-it-working.md arise only on a site someone has customized or built by hand. Mirror it at the top of is-it-working.md's condition list, so an admin reading a wall of "Ask a developer" knows those are not expected on the default path.
```


### `docs/editors` walk (7 findings)

**Completed:** false

**Stopped at:**

```text
welcome.md, "Signing in" step 1. No page in docs/editors states where the sign-in page is or how to find it, so as a reader who knows only what the track says I never open the editor at all. I continued the walk on the assumption that my site owner had separately sent me the address, and recorded every further guess below.
```

7 findings, all UNVERIFIED (the verify stage drew only from the claims sweeps).

**Coverage note:**

```text
All 8 pages of docs/editors read in the README's index order (README, welcome, write-in-the-editor, publish-and-history, when-something-goes-wrong, then add-an-image, manage-the-media-library, manage-your-tag-vocabulary). Track containment verified mechanically: every markdown link in the track resolves to another docs/editors page, so a reader at cairn.pub/help is never sent to a track they cannot follow. No page assumes a state an earlier page failed to produce, with the single exception of finding 3, where publish-and-history.md treats the position of Save and Publish as established by the screen tour that omits them. Two of the three goal legs are well served end to end: the writing and formatting page and the image page both carried me without a guess once I was inside the editor, and the refusals page quotes messages verbatim and matches them to actions in all but one case. The failures cluster at the two ends of the journey, getting in and getting out: the track never locates its own front door (finding 1), never explains the one field the create dialog demands (finding 2), never locates the two controls the goal turns on (finding 3), and never shows the reader the result (finding 7). Opinions about prose clarity are omitted deliberately per the walk rules; every finding above is a fact I needed and no page in this track states.
```

#### Rank 1 — `docs/editors/welcome.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
1. Open your site's sign-in page. Enter the email address your site owner added for you, then select **Send sign-in link**.
```

**What the walker had to guess:**

```text
Where the sign-in page is. No page in the editors track gives its address, its shape (for example, my site's address followed by a fixed path), or any statement that the owner sends it to me. I know my site's public address, but nothing on the public site is said to link to the editor, and step 1 assumes I am already looking at a page the track never locates. This is the first instruction in the track and it is the one I cannot execute.
```

**Proposed change:**

```text
State in step 1 how a reader reaches the sign-in page, in the two forms a real editor encounters it: the address is your site's address followed by /admin (or whatever path your owner set), and your site owner normally sends you that address when they add you. Add a fallback line for the reader who has neither: ask your site owner for the address of your editor.
```


#### Rank 2 — `docs/editors/write-in-the-editor.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
You're asked for a title, an address, and sometimes a date, then you land straight in the editor with that entry open.
```

**What the walker had to guess:**

```text
What to type in the address field. Nothing in the track says whether an address is a full web address beginning with https, or a short name; whether spaces or capitals are allowed; whether it fills in from the title automatically and can be left alone; or that it becomes part of the entry's public web address. The track only defines the term later and elsewhere ("Every entry that appears as its own page has an address on your site"), after the dialog that demands one. "An entry with that address already exists" in the refusals page confirms I can get this wrong at creation time.
```

**Proposed change:**

```text
In "Opening or starting a draft", describe the address field where the reader first meets it: say it is the short name that appears at the end of the entry's web address, not a full web address; say whether it is filled in from your title so most of the time you can accept it; and give one concrete example (a title of "Spring cleanup day" gives an address of spring-cleanup-day). Then point to "Changing an entry's address" in Publish and history for changing it later.
```


#### Rank 3 — `docs/editors/publish-and-history.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
Select **Save** and your changes are kept. Nobody sees them on the live site yet.
```

**What the walker had to guess:**

```text
Where the Save and Publish controls are on screen. "The screen" section of Write in the editor walks the whole editor (title field, writing surface, Write and Preview tabs, the Details icon in the header, the footer strip) and never mentions Save or Publish. Publish and history then repeatedly says "Select Save", "Select Publish", and "the overflow menu next to Save and Publish" as if their location were established. Publishing is the goal verb of this walk and I had to guess the two buttons sit in the header beside the Details icon.
```

**Proposed change:**

```text
Add Save and Publish to the "The screen" tour in write-in-the-editor.md, naming where they sit and noting the overflow menu beside them that holds Discard changes, Delete, and History. Alternatively, open the Save section of publish-and-history.md by locating the controls before describing what they do.
```


#### Rank 4 — `docs/editors/manage-your-tag-vocabulary.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
Tags are a shared list every editor on your site picks from when they write.
```

**What the walker had to guess:**

```text
Where on an entry I actually pick tags, and what else the Details panel holds. The track devotes a full page to maintaining the shared list and quotes a refusal about it ("'X' is not in your tag list"), but no page describes the tag field on the entry itself. More broadly, Details is introduced only as "the fields that hold things like whether it's hidden and what address it has", and its remaining fields surface only as scattered refusals ("Pick a date for this entry") or in another page (the hero image). Preparing a first entry for publishing, I had to guess that tags, date, and anything else my site requires live in Details, and I learn which fields are required only by being refused.
```

**Proposed change:**

```text
Add a short "What's in Details" list to write-in-the-editor.md's screen tour: the address, Hidden, the date, tags picked from your site's shared list, and the entry's lead picture, with a line saying your site may add its own fields and that required ones stop a publish until they're filled. Have manage-your-tag-vocabulary.md open by saying where an editor picks tags on an entry before describing how the shared list is maintained.
```


#### Rank 5 — `docs/editors/when-something-goes-wrong.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
**"This image is too large to add, even after shrinking it."** The picture's dimensions are too large for the editor to handle, even after it tried to scale the image down.
```

**What the walker had to guess:**

```text
What to do about it. This is the only refusal on the page that restates the message and then stops: no size or dimension limit, no remedy, and no one to ask. Every neighbouring entry ends in an action (try a JPEG, export it as a JPEG first, try again, tell your site owner). Understanding a refusal is the third leg of this walk's goal, and here I had to guess both what "too large" means numerically and what a non-technical author is supposed to do with a photo that trips it.
```

**Proposed change:**

```text
Give this entry a remedy in the same shape as its neighbours: state the dimension limit in pixels, and tell the reader to resize or crop the picture in whatever they used to view it before trying again. Consider stating the same limit up front in add-an-image.md's "Uploading a new picture" section so most readers never hit the refusal.
```


#### Rank 6 — `docs/editors/manage-the-media-library.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
Every image ever added to your site lives in one place: the media library. This is where you work on those images directly, with no draft entry open.
```

**What the walker had to guess:**

```text
How to open the media library. The page describes a screen for three thousand words without ever saying how to reach it. The sibling page does the equivalent job for its screen ("If you don't see Tags in your sidebar at all"), which sets the expectation that a screen page locates itself, so its absence here reads as an omission rather than a convention.
```

**Proposed change:**

```text
Open the page by locating the screen, matching the Tags page: name the sidebar item that opens it and what it is called there, and add the same line about what it means if you don't see it in your sidebar.
```


#### Rank 7 — `docs/editors/publish-and-history.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
The note that follows reads: "Published. The live site is rebuilding," which usually takes a moment.
```

**What the walker had to guess:**

```text
How to go look at what I just published. Having finished the walk's main goal, I have no stated way to see the result: no page says how to open the live entry from the editor, or how to work out its public web address from the address I chose at creation. I had to guess that my entry's address, combined with my site's address, is where it now lives.
```

**Proposed change:**

```text
Add a sentence after the publish note saying how to view the published entry: name the control that opens it on the live site if there is one, and otherwise state that the entry is now at your site's address followed by the address you gave it.
```


### `docs/extend` walk (12 findings)

**Completed:** false

**Stopped at:**

```text
docs/extend/add-a-custom-admin-screen.md, at the "Gate it" section. I had a deployed site (build-a-site-by-hand Milestones 1-4) and a second concept declared, but could not complete the gating step: `requireAccess` 403s every session including the owner unless the route's path is in an access map, and `defineAccess(roles, map)` requires a `roles` declaration that no page I had read produces. Goal 1 (evaluate whether cairn fits) also had no entry point in this track, and goal 2 (stand a site up) stopped short of a working production sign-in at Milestone 5.
```

12 findings, all UNVERIFIED (the verify stage drew only from the claims sweeps).

**Coverage note:**

```text
Read all 31 pages of docs/extend, in the index order the README declares (the two entry points, the deep path, building blocks, admin surfaces, design, publishing-flow extensions, versioning, concepts). I followed links out of the track into docs/reference only to confirm whether a fact I had to guess existed anywhere at all, never to fill the gap and walk on; every such check is reported as a finding rather than a step. Goal outcomes: goal 1 (evaluate fit) had no entry point in this track; goal 2 (stand a site up) carried me cleanly through build-a-site-by-hand Milestones 1-4, then stalled at Milestone 5 on the unnamed email-sender onboarding, with a localhost ORIGIN shipping to production; goal 3 (declare my own concept) completed with two guesses about where the second glob lives and whether the manifest plugin needs it; goal 4 (ship one custom admin screen) did not complete. Pages I read that produced no finding and no guess on my path: architecture.md, content-model.md, security-model.md, auth-channel-security-model.md, render-safety.md, data-tiers.md, upgrade-cairn.md, migration-notes.md, debug-your-site.md, announce-on-publish.md, choose-an-ai-posture.md, share-a-draft-preview.md, rotate-the-github-app-key.md, add-an-island.md, link-content-with-references.md, what-the-scaffold-wrote.md, design-your-site.md. Two smaller guesses I logged but ranked out of the list: migrate-existing-content.md never says to run `npx cairn-manifest` after bulk-writing files, though build-a-site-by-hand states that any hand-edit outside the admin requires it; and define-an-adapter-and-schema.md says `routing: 'feed'` \"gives you a sane default permalink\" without ever stating the default shape (I inferred `/:year/:month/:slug` from an unrelated line in build-a-site-by-hand's Milestone 3).
```

#### Rank 1 — `docs/extend/add-a-custom-admin-screen.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
Declare a rule for this route's path in the access map or every session, owner included, gets a 403; see [Restrict admin access by role](./restrict-admin-access.md) for the map itself.
```

**What the walker had to guess:**

```text
What to pass as the first argument to `defineAccess(roles, map)` on a site that never called `defineRoles`. My adapter (from define-an-adapter-and-schema and build-a-site-by-hand) exports no `roles` value, yet restrict-admin-access.md opens with `import { roles } from './cairn.config.js'` and never says where that export comes from. The only page that produces it is add-a-second-audience.md, which sits AFTER restrict-admin-access in the index and is framed as a different journey (a second population, not my own editors). I also had to guess which role name to list for an ordinary editor under the zero-config owner/editor default, given that restrict-admin-access says never to name `owner` while the core reference says an empty list is an error. Without this the goal is unreachable: my screen refuses me.
```

**Proposed change:**

```text
In restrict-admin-access.md, before "Declare the map", show the zero-config case explicitly: either a `defineRoles({ owner: 'owner', editor: 'editor' })` declaration exported from `cairn.config.ts` that a site adds when it first wants an access map, or a statement that `defineAccess` accepts the default vocabulary with no `defineRoles` call and what to pass. Add the same `roles` export to define-an-adapter-and-schema.md's assembled adapter, or add an explicit precondition line to restrict-admin-access.md naming which page produces `roles`.
```


#### Rank 2 — `docs/extend/add-a-custom-admin-screen.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
export const handle = wireAuditSink;
```

**What the walker had to guess:**

```text
How to compose one `hooks.server.ts` out of three pages that each claim the whole file with a bare default. build-a-site-by-hand.md:318 ends with `export { handle }` branching on the dev backend vs `createAuthGuard()`; restrict-admin-access.md:43 replaces it with `export const handle = createAuthGuard({ roles, access })` (silently dropping the dev-backend branch and my local development loop); this page replaces it again with `wireAuditSink`. Only restrict-admin-access mentions `sequence` at all, in one prose sentence, and no page shows the composed file or states the ordering constraint (the audit sink must attach relative to the guard that sets `locals.cairnAccess`). Following the track in index order, I overwrite the file three times and lose two capabilities.
```

**Proposed change:**

```text
Pick one page as the owner of `hooks.server.ts` (build-a-site-by-hand is the natural home) and show the full composed file there: the dev-backend branch, `createAuthGuard({ roles, access })`, and `wireAuditSink`, chained with `sequence` in the required order. Every other page shows only its own `Handle` function and points at that composed example rather than exporting `handle` itself.
```


#### Rank 3 — `docs/extend/build-a-site-by-hand.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
everything through Milestone 3; Milestone 5 needs Workers Paid, named at the point it matters).
```

**What the walker had to guess:**

```text
What Milestone 5 actually requires before a magic-link email sends. The promise "named at the point it matters" is never kept: Milestone 5 defers its whole setup to add-cairn-to-a-sveltekit-app.md, which adds `"send_email": [{ "name": "EMAIL" }]` and never mentions Workers Paid, an Email Sending subdomain, or the `wrangler email sending enable` onboarding step. Grepping the whole track, the onboarding requirement appears once, in define-an-adapter-and-schema.md, pointing at ../admin/before-you-start.md, a page the build-a-site-by-hand path never reaches. So at Milestone 5's success criterion ("signing in at /admin/login on the deployed site sends you a real email") I had a bound `EMAIL` and no way to know why nothing arrives.
```

**Proposed change:**

```text
Add the sender-onboarding step to add-cairn-to-a-sveltekit-app.md's "Wire the bindings" section: the Workers Paid requirement for arbitrary recipients, the `wrangler email sending enable <apex-domain>` command, and the fact that the `from` address must live on that onboarded subdomain. Milestone 5 already links this page, so naming it once there keeps both paths honest.
```


#### Rank 4 — `docs/extend/build-a-site-by-hand.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
export const ORIGIN = 'http://localhost:5173';
```

**What the walker had to guess:**

```text
That `ORIGIN` has to change before deploying, and what its relationship is to the separate `PUBLIC_ORIGIN` var Milestone 5 adds to `wrangler.jsonc`. Milestone 3 sets ORIGIN to localhost; Milestone 4 deploys; Milestone 5 adds `PUBLIC_ORIGIN` to the Worker vars and never revisits ORIGIN. Nothing on the track states what reads `PUBLIC_ORIGIN`, what reads `ORIGIN`, or that they are different things. Following the page literally, my deployed site's canonical URLs, feed, and sitemap all emit `http://localhost:5173`.
```

**Proposed change:**

```text
In Milestone 4 or 5, add an explicit step changing `ORIGIN` in `src/lib/content.ts` to the deployed `workers.dev` URL, and one sentence distinguishing the two: `ORIGIN` is the build-time literal the delivery routes prefix URLs with; `PUBLIC_ORIGIN` is the runtime Worker var the engine builds sign-in and preview links from. Mirror that sentence in wire-the-delivery-surface.md, where `ORIGIN` is first exported.
```


#### Rank 5 — `docs/extend/add-cairn-to-a-sveltekit-app.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
`0002_audit.sql` if you wire an audit sink, and `0003_preview.sql` if you use [Share a draft preview](./share-a-draft-preview.md).
```

**What the walker had to guess:**

```text
Whether the audit table belongs in `AUTH_DB` or its own database. This page says to copy the numbered migrations into `migrations/` and apply them to `my-site-auth`, which puts `audit_log` in `AUTH_DB`. But add-a-custom-admin-screen.md then reads `event.platform?.env.AUDIT_DB`, a binding no page told me to create, and reference/sveltekit.md says the audit database needs its own `migrations_dir` because "copying 0002_audit.sql next to the auth migrations and applying it to the audit database applies the auth migrations there too". add-a-second-audience.md gives the same shared-directory warning for its own channel database. The track's own instruction and its own worked example disagree.
```

**Proposed change:**

```text
Change add-cairn-to-a-sveltekit-app.md's migration list so `0002_audit.sql` is not filed alongside the auth migrations: state that the audit sink takes its own D1 binding (`AUDIT_DB`) with its own `migrations_dir`, and link the reference's worked wrangler block. Add the `AUDIT_DB` provisioning step to add-a-custom-admin-screen.md's "Wire the AuditSink" section, since that page's example is the first place a reader meets the binding.
```


#### Rank 6 — `docs/extend/add-a-custom-admin-screen.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
import type { Env } from '../env.js';
```

**What the walker had to guess:**

```text
That I must author `src/lib/env.ts` myself, and what has to be in it. No extend page defines `Env`, tells me to create the file, or names its members. The same import appears again in add-a-second-audience.md:80. The only shape anywhere is in reference/auth-channel.md, for a different binding set. I also had to guess where `CLUB_DB` comes from, since `resolveDb: (env) => env?.CLUB_DB` names a D1 binding no page provisions or adds to `wrangler.jsonc`.
```

**Proposed change:**

```text
Show the `src/lib/env.ts` file inline in add-a-custom-admin-screen.md before the `createSectionAction` snippet, with the `CLUB_DB` member and the `@cloudflare/workers-types` import, plus the one-line `wrangler d1 create` and `d1_databases` entry that binds it. Reuse the same file in add-a-second-audience.md rather than importing an undefined type twice.
```


#### Rank 7 — `docs/extend/declare-your-own-concept.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
import { postsRaw } from './content.js';
```

**What the walker had to guess:**

```text
Which file this snippet belongs in. It imports `postsRaw` from `./content.js` and then exports `indexes`, but `content.ts` (as written in build-a-site-by-hand.md and wire-the-delivery-surface.md) declares `postsRaw` as a non-exported local and already exports `indexes` itself. So either the snippet IS content.ts, in which case the import is circular and the const is redeclared, or it is a new file, in which case my delivery routes still read the stale `indexes` from content.ts and never see the second concept. reuse-content-across-entries.md:48 repeats the identical pattern for `fragments`.
```

**Proposed change:**

```text
Give both snippets a `// src/lib/content.ts` path comment and show the edit as an in-place addition to that file (a second `import.meta.glob` const beside the existing one, and the concept added to the `createSiteIndexes` third argument), dropping the `import { postsRaw }` line entirely.
```


#### Rank 8 — `docs/extend/README.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
Neither of those two pages assumes the other has run; everything past this point assumes one of them has.
```

**What the walker had to guess:**

```text
Which page to actually start from. The index tells me define-an-adapter-and-schema.md "produces one from nothing", but that page's own second line reads "**Precondition:** cairn installed in a SvelteKit app, either from [Build a site by hand] or [Add cairn to a SvelteKit app]". The index's claim and the page's own precondition contradict each other, so I had to guess whether define-an-adapter is a starting point or a middle chapter. (It is a middle chapter.)
```

**Proposed change:**

```text
Rewrite the "Before any of this" section to match the pages' real preconditions: build-a-site-by-hand.md and add-cairn-to-a-sveltekit-app.md are the two entry points, and define-an-adapter-and-schema.md is what both of them hand off to. Name the fork by starting state (nothing yet vs an existing SvelteKit app) rather than by which page produces an adapter.
```


#### Rank 9 — `docs/extend/build-a-site-by-hand.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
namespace App {}
```

**What the walker had to guess:**

```text
How to declare `App.Platform` so a custom route's platform reads typecheck. This is the only `app.d.ts` on the track and its `App` namespace is empty. add-a-custom-admin-screen.md then writes `event.platform?.env.AUDIT_DB` under a comment saying it "reads App.Platform (env, ctx.waitUntil), which only the site's own app.d.ts declares" without ever showing that declaration, and enable-tidy.md refers to `CairnPlatformBindings` as though I had already intersected it. The instruction to do so exists only inside a reference table cell in reference/sveltekit.md. Every page's stated success criterion is `npm run check` passing, which this breaks.
```

**Proposed change:**

```text
Extend build-a-site-by-hand.md's `app.d.ts` block with the `App.Platform` interface intersecting `CairnPlatformBindings` and the site's own bindings, and say in one sentence why `/ambient` cannot do it (it augments `App.Locals` only). Then add-a-custom-admin-screen.md's snippet-check-skip comment can point at that block instead of at a file the reader never wrote.
```


#### Rank 10 — `docs/extend/README.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
You're evaluating cairn, taking over a scaffolded site, or already building on it.
```

**What the walker had to guess:**

```text
Everything about whether cairn fits my organization. The index names evaluation as one of three reasons I am here and then offers no page for it: no trade-offs, no comparison, no scope boundary, and no link to why-cairn.md anywhere in the track (grep confirms zero references across all 31 pages). architecture.md describes the engine's shape but presumes the decision is already made. A developer who arrives at docs/extend/README.md directly, which the docs front door invites for "a Svelte developer extending a site", has no route to the evaluation material.
```

**Proposed change:**

```text
Add a first bullet to the extend README's opening, before "Before any of this", linking ../why-cairn.md as the fit-and-trade-offs read, in the same way the README already routes editors and admins to their own tracks.
```


#### Rank 11 — `docs/extend/declare-your-own-concept.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
That's the whole adapter declaration, but `createSiteIndexes` needs a matching glob too: it throws at build time for any declared concept with no glob passed
```

**What the walker had to guess:**

```text
Whether the `cairnManifest` Vite plugin's own `content` map needs the new concept too. build-a-site-by-hand.md configures it as `content: { posts: '/src/content/posts/*.md' }`, and this page names the glob-drift trap for `createSiteIndexes` while saying nothing about the plugin's parallel map. The page's success criterion is "`npm run build` succeeds with the new glob wired in", and the manifest plugin runs during that build, so I could not tell whether a missing entry fails loudly, silently omits the concept from the manifest, or does not matter.
```

**Proposed change:**

```text
Add the `cairnManifest` `content` entry beside the `createSiteIndexes` glob in this page's steps, and state what happens if it is missed (the concept's entries never enter the committed manifest). The same addition belongs in reuse-content-across-entries.md, which has the identical shape for `fragments`.
```


#### Rank 12 — `docs/extend/reuse-content-across-entries.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
The resolver is `FragmentResolve`, the type `SiteRender`'s `resolveFragment` option takes; a build supplies one backed by [`buildFragmentResolver`](../reference/delivery-data.md#buildfragmentresolver)
```

**What the walker had to guess:**

```text
Where `resolveFragment` gets wired. Every adapter example on the track writes `render: ({ body, resolve, resolveMedia }) => renderMarkdown(body, { resolve, resolveMedia })`, destructuring three parameters and passing two. Nothing shows `resolveFragment` threaded through, and "a build supplies one" does not say which file, which call, or whether the adapter's `render` needs editing at all. I could not tell whether includes work with the adapter exactly as define-an-adapter-and-schema.md left it.
```

**Proposed change:**

```text
Show the updated adapter `render` line in this page, passing `resolveFragment` through alongside `resolve` and `resolveMedia`, and name the file it lives in. If the delivery layer supplies it without an adapter edit, say that explicitly instead.
```


### `docs/reference` walk (8 findings)

**Completed:** false

**Stopped at:**

```text
core.md's adapter surface. I completed two of my three lookups (a gated custom /admin screen with an audited action, and correlating a failed publish to its log event plus the doctor check), but stopped without an answer on the third: which key a site declares on the adapter to turn on media, and which key enables the built-in nav editor. Neither is answerable from the track without guessing, and both are prerequisites for the rest of the media and nav lookups.
```

8 findings, all UNVERIFIED (the verify stage drew only from the claims sweeps).

**Coverage note:**

```text
Walked all 24 pages of docs/reference in README index order, as the extender/admin lookup persona, under knowledge suppression. Read in full: README, core, sveltekit (all 1,981 lines), admin-routes, admin-grammar-tokens, components (through the composed-components tier), render, islands, delivery, media, auth-store, auth-channel (the factory contract and config fields), auth-crypto, cloudflare, vite, ambient, cli-cairn-manifest, cli-cairn-media-seed, doctor, log-events, supported-toolchain. Read partially, by heading inventory plus targeted lookups against my goals: admin-toolkit (formatters and field tier), delivery-data, cairn-audit; a lookup that landed inside those three (formatter contracts, the entry-index builders, the audit rules) was answered without a guess, so their unread body is a coverage gap rather than a clean bill. Two of my three lookups completed with no guess: a gated custom /admin screen (admin-routes mount, core defineAccess/canReach, sveltekit requireAccess/createSectionAction/createD1AuditSink/navLayout, admin-toolkit primitives, ambient locals) and correlating a failed publish to publish.failed plus the matching cairn-doctor checks. The third, configuring media and the nav editor on the adapter, dead-ended on findings 1-3. Two counts I could check held: doctor.md's \"Nineteen checks run by default\" matches its table, and admin-grammar-tokens' eighteen tokens plus thirteen utilities match theirs; admin-grammar-tokens' \"five ratified exceptions\" does not (its table lists three rows, one of them covering three sites), which I did not file since it is a self-contained count rather than a lookup I had to guess through.
```

#### Rank 1 — `docs/reference/core.md (with docs/reference/media.md, docs/reference/sveltekit.md)` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
core.md:1020 — "| `AssetConfig` | Extension API | `interface AssetConfig` | A site's media configuration ... See the `assets` adapter member above. |" against core.md:258 — "A site turns on R2-backed media by declaring `media`; omitting it leaves media off." and media.md:20 — "it reads the committed `media.json`, normalizes its adapter `assets` block"
```

**What the walker had to guess:**

```text
Whether the adapter member that configures media is called `media` or `assets`. core.md's own section heading is `#### `media` (adapter member)`, its prose says `media`, and its six-group list names `media`; but core.md's own Types table points at an `assets` adapter member that has no section on the page, and media.md ("An absent `assets` block yields the `{ enabled: false }` variant", "the site's `assets.transformations` on") plus sveltekit.md:1892 ("the adapter's `assets` block turns media on") all say `assets`. Five of the six mentions across the track say `assets`; the one page that actually documents the member says `media`. I could not resolve this from the track, and a wrong guess is either a thrown config error or a silently media-off site.
```

**Proposed change:**

```text
Pick one name and sweep it. If the real member is `media`, fix core.md's `AssetConfig` and `VariantSpec` rows to say "See the [`media` adapter member](#media-adapter-member)", and rewrite media.md's three `assets` references and sveltekit.md's `CairnMediaBindings` note to `media`. If it is `assets`, rename core.md's section heading, its prose, and the `defineAdapter` group list. Either way add the member to a worked `defineAdapter` snippet so the key appears once in copyable code, and add the member name to the symbol sweep so the two spellings cannot both survive.
```


#### Rank 2 — `docs/reference/admin-routes.md (with docs/reference/sveltekit.md, docs/reference/core.md)` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
admin-routes.md:121 — "| `/admin/nav` | nav | The nav tree editor. A 404 unless the adapter configures `editor.nav`. |" against sveltekit.md:147 — "The nav view is a 404 unless the runtime configures a `navMenu`."
```

**What the walker had to guess:**

```text
How to enable the built-in nav editor at all. The two pages name two different keys (`editor.nav` on the adapter versus `navMenu` on the runtime), and no page in the track documents either one as a member: core.md's `editor` group section documents only `supportContact` and `preview`, and `NavMenuConfig` appears in three Types tables as a bare `interface NavMenuConfig` with no members and no worked declaration. So I could not learn the key, its shape, or which object it goes on. The same gap makes `NavLayoutEngineRef`'s rule ("`nav` is a valid reference only when the adapter configures a nav menu") unactionable, and it makes `createNavRoutes` and `NavTree` unreachable for a site that has not already got the menu configured.
```

**Proposed change:**

```text
Add a `#### `nav` (adapter `editor` member)` section to core.md beside `supportContact` and `preview`: the real key, the expanded `NavMenuConfig` members (`name`, `label`, `maxDepth` per `NavLoadData`), and a snippet declaring it inside `defineAdapter`. Then make admin-routes.md and sveltekit.md both link that anchor instead of naming a key inline, so the two spellings collapse to one.
```


#### Rank 3 — `docs/reference/core.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
core.md:43 — "The adapter has six groups: `content`, `backend`, `email`, `rendering`, `media`, and `editor`."
```

**What the walker had to guess:**

```text
The adapter's actual member list, and which members are required. The track documents at least four more adapter members outside this list: `roles` (core.md:897 shows it inside `defineAdapter`), `access` (core.md:962, "the adapter's `access` member"), `aiPosture` (core.md:1021, "named by `CairnAdapter.aiPosture`"), and `editor.navLayout`/`editor.publishActions` on sveltekit.md. `CairnAdapter`'s own Types row is a bare `interface CairnAdapter` with no members, so nothing on the page enumerates the real surface. Every worked snippet elides the rest with `// ...content, backend, email, rendering...`, which also left me guessing whether `email` and `rendering` are required and `media`/`editor` optional. I had to assume the count was stale rather than the members being wrong.
```

**Proposed change:**

```text
Replace the sentence with an explicit member table under `defineAdapter`: each member (`content`, `backend`, `email`, `rendering`, `media`, `editor`, `roles`, `access`, `aiPosture`), required or optional, one-line meaning, and a link to its own section. Drop the count, since a number in prose goes stale on the next member; the table is the thing `check:reference` can be pointed at.
```


#### Rank 4 — `docs/reference/render.md (with docs/reference/core.md)` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
render.md:19 — "- `headRow(title, icon?, level?)` builds the icon-plus-heading head row; the heading level defaults to 2." against core.md:672 — "declare function headRow(title: ElementContent[], icon?: Element): Element;"
```

**What the walker had to guess:**

```text
Whether `headRow` takes a third `level` argument, and which subpath to import the component-author helpers from. core.md documents `glyph`, `iconSpan`, `cardShell`, and `headRow` as root-package exports with a gate-checked two-parameter signature; render.md documents `cardShell`, `headRow`, and `iconSpan` as `@glw907/cairn-cms/render` exports with a three-parameter `headRow`. The README says `check:reference:signatures` compares only the declared `ts`-block signature, and render.md carries no `ts` block for these, so nothing forces the two pages to agree. I had to guess that the prose arity was right and that either import path works.
```

**Proposed change:**

```text
Give render.md real `ts` declaration blocks for `cardShell`, `headRow`, `iconSpan`, `strAttr`, and `isElement` so the signature gate covers them, and reconcile `headRow`'s arity in both places. Then state once, on whichever page is canonical, which import path a component author should use, and have the other page link rather than restate the helpers.
```


#### Rank 5 — `docs/reference/log-events.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
log-events.md:17 — "| `auth.link.requested` | info | A magic-link request reaches `POST /admin/auth/request`. | `email` |"
```

**What the walker had to guess:**

```text
Which request path actually produces this event, so I could filter Workers Logs by path and correlate it with a `guard.rejected` record. admin-routes.md's URL table lists only `/admin/login` and `/admin/auth/confirm` under the mount and says "Any other shape is a 404", the action table registers `request` on the login view, and doctor.md:136 probes "POST <url>/admin/login?/request". So `/admin/auth/request` is a path the rest of the track says does not exist. I had to guess that the real path is `/admin/login?/request` and that this row is stale.
```

**Proposed change:**

```text
Change the `Fires when` cell to name the action rather than a route: "The login view's `?/request` action runs (`POST /admin/login?/request`)." Check `auth.token.confirmed`'s `POST /admin/auth/confirm` the same way, since the confirm view posts a named `?/confirm` action too, and add these path strings to the symbol sweep so a route that no longer exists fails the gate.
```


#### Rank 6 — `docs/reference/sveltekit.md (with docs/reference/core.md)` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
sveltekit.md:1892 — "`interface CairnMediaBindings { MEDIA_BUCKET: R2Bucket }` | The R2 binding a media-enabled site adds to its `Platform.env` intersection"
```

**What the walker had to guess:**

```text
Whether the R2 binding name is fixed at `MEDIA_BUCKET`. core.md:258 says "`bucketBinding` names the R2 bucket bound to the Worker and is the one required field", which reads as free-form, and media.md's snippet passes `normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' })` as an example rather than a constant. doctor.md's `config.media-bucket` check ("The adapter's declared media R2 bucket has a matching `r2_buckets` binding") also reads as name-agnostic. So a site that names its binding `IMAGES` cannot tell from the track whether `CairnMediaBindings` still applies, or whether intersecting it would assert a binding the Worker does not have.
```

**Proposed change:**

```text
State the relationship explicitly in the `CairnMediaBindings` row: either "`MEDIA_BUCKET` is the conventional name; a site whose adapter names a different `bucketBinding` declares that name in its own env intersection instead of this preset", or, if the name is genuinely fixed, say so in core.md's `bucketBinding` paragraph and drop the free-form reading.
```


#### Rank 7 — `docs/reference/components.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
components.md:304 — "data={{ ...data, siteName: siteConfig.siteName }}"
```

**What the walker had to guess:**

```text
Where `siteConfig` comes from in the `EditPage` snippet. The snippet's `<script>` imports only `EditPage`, the `EditData` type, and `cairn` from `$lib/cairn.config.js`; `siteConfig` is never imported, so the block as printed does not compile. I had to guess that `siteConfig` is a second named export of the same module (core.md's `composeRuntime` snippet does import both from `./cairn.config.js`, which is where I got the guess from) rather than something the load supplies.
```

**Proposed change:**

```text
Add `siteConfig` to the snippet's import (`import { cairn, siteConfig } from '$lib/cairn.config.js';`), and make `data`'s type in the snippet match the prop's declared `EditData & { siteName: string }`. If the Svelte snippets are outside `check:snippets`, note that gap so the same defect class is caught by review rather than by a reader's compiler.
```


#### Rank 8 — `docs/reference/sveltekit.md` — UNVERIFIED (walk finding; not in the verify sample)

**Quoted:**

```text
sveltekit.md:1699 — "// src/lib/cairn.config.ts" heading the attention snippet, followed by sveltekit.md:1713 — "Wire the function above onto [`ContentRoutesOptions.attention`](#contentroutesoptions) (or [`CairnAdminOptions.attention`](#cairnadminoptions) on the single-mount facade)"
```

**What the walker had to guess:**

```text
Where the `attention` callback is actually wired. The snippet defines and exports it from `cairn.config.ts` beside `defineAdapter`, which is exactly where `roles` and `access` live, and the prose says to wire it onto a deps bag instead, without showing that line. Since `CairnAdminOptions` says "`roles` and `access` ... are not deps here: they live on the adapter", the two shapes are easy to confuse. I had to guess the missing line is `createCairnAdmin(runtime, { attention })` in `cairn.server.ts`.
```

**Proposed change:**

```text
Extend the snippet to the second file: keep the `attention` function where it is, then show `export const admin = createCairnAdmin(runtime, { attention });` in `src/lib/cairn.server.ts`, so the seam's wiring appears once in copyable code rather than only in prose.
```


### Stage 3: the fishtank cross-track read

### Fishtank read (15 findings, 0 verified)

15 findings, all UNVERIFIED (the verify stage drew only from the claims sweeps).

**Coverage note:**

```text
Read in full, on the pass-d-phase-3 worktree tree: docs/README.md, README.md (root), docs/why-cairn.md, all four track indexes, all 7 admin content pages, all 7 editors content pages, all 30 extend pages (openings, contract/precondition lines, and full bodies for build-a-site-by-hand's CSRF section, add-a-second-audience, share-a-draft-preview, upgrade-cairn, rotate-the-github-app-key, what-the-scaffold-wrote), docs/reference/README.md and doctor.md in full plus the ledes and H1s of the other 22 reference pages. Governing docs read: the methodology, the audience profiles, and the target manifest sections 1-4.

Contracts: every page states one. The extend track states it two ways (11 pages carry an explicit "**Contract:**/**Precondition:**" pair, 19 carry it as a lede) — an anatomy inconsistency I did not fire on, since both forms state the job and stage 4 owns shape. Job collisions checked pairwise across the plausible overlaps: is-it-working vs reference/doctor, admin/troubleshooting vs extend/debug-your-site vs admin/setup-recovery, add-a-second-audience vs restrict-admin-access vs add-a-custom-admin-screen vs organize-your-admin-nav, extend/share-a-draft-preview vs editors/publish-and-history, extend/README's stability statement vs reference/README's tiers, why-cairn's trade-offs vs before-you-start's costs. All are explicitly delegated except the editors alt-text pair (rank 5).

Preconditions: walked each track's index order. Extend's global adapter precondition (extend/README.md:13-20) covers the 19 pages with no per-page precondition line; the two producer pages it names both exist and neither assumes the other. The one wrong-producer claim is rank 7.

Cross-track links: verified the editors track emits zero outbound links (`grep -n "](\.\./\|](http\|](/" docs/editors/*.md` returns nothing), so the /help render stands alone. Admin-to-extend and extend-to-admin hand-offs are all explicit and linked; the only defects are a missing anchor (rank 9) and a stale label (rank 13).

Redirect map: checked all 50 manifest deletion-list rows against /home/glw907/Projects/cairn-pub/_redirects (read only, not built). Membership is exact — 35 guides rules, 2 tutorial, 12 explanation, 1 authoring-syntax, plus the 2 /help stem-rename aliases; no retired URL is unmapped and no rule is orphaned. Every destination resolves to a route the new loader serves (verified each against the shipping tree and against pass-d-docs-tracks:src/lib/docs/loader.ts, which routes /docs, /docs/why-cairn, /docs/<arm>, /docs/<arm>/<stem>, /help, /help/<stem>). Confirmed against cairn-pub main:src/lib/docs/loader.ts that the old tutorial's first stem served only at /docs/tutorial and that the /help alias covered exactly the six editor guides, so the URL column the map was built from is right. Both flagged one-to-many calls: I agree with both targets; rank 12 proposes a fragment refinement on one, not a different page.

Not checked (out of stage 3's scope or blocked): I did not run any gate, build cairn-pub, or verify numeric/API claims (stage 0 and 1 own those). I did not grade tone, register, or vocabulary breaches on their own (stage 4), except where a vocabulary breach was also a precondition failure (rank 1). I did not read the bodies of the four largest generated-shape reference pages (core, sveltekit, components, admin-toolkit, delivery-data, cairn-audit) beyond their ledes and H1s, since they are machine-gated by check:reference and :signatures and carry no track story. One cairn-pub-side timing risk I noticed but did not file as a docs finding: legacy-redirects.test.ts's third case ("never redirects a source that the current corpus still serves itself") resolves the corpus from the *installed* @glw907/cairn-cms, so it will fail until the package shipping the new tracks is published — a release-ordering item for the conductor, not a defect in these bytes.
```

#### Rank 1 — `docs/admin/is-it-working.md` — UNVERIFIED

**Quoted:**

```text
**Act:** onboard the sending domain with `npx wrangler email sending enable <domain>`, then redeploy with `npx wrangler deploy`. The domain has to match your site's configured sign-in sender.
```

**Criterion:**

```text
Admin profile, "What needs a developer" precondition: docs/admin/before-you-start.md:63-64 classifies a wrangler task as one the admin cannot do ("**Rotating the GitHub App's private key.** This is a terminal-and-`wrangler` task"), and no earlier page in the admin track's order (before-you-start, create-your-site, own-your-domain) ever installs wrangler, authenticates it, or shows the admin running it. The admin profile's success criterion requires every failure to end in a step "classified wait, act, or ask a developer"; this row is classified **Act** while requiring a tool the track never produced.
```

**Proposed change:**

```text
Reclassify the `email.sender-not-onboarded` row to the same shape the `auth.store-unreachable` row already uses on this page: "**Act:** re-run `npx create-cairn-site --dir <your-site-directory>` and say yes when it asks to turn on sign-in email; it onboards the sending domain and redeploys for you. If it still fails afterward, that is a developer's job." Keep the two `wrangler` commands only as a parenthetical for a developer, or move them under an **Ask a developer:** label.
```

**Kind:** procedural


#### Rank 2 — `docs/admin/is-it-working.md` — UNVERIFIED

**Quoted:**

```text
**A gap worth knowing about:** a site scaffolded with a current SvelteKit toolchain carries no `svelte.config.js` file at all; that wiring now lives inside `vite.config.ts` instead.
```

**Criterion:**

```text
Contradicted by the sibling shipping page docs/extend/what-the-scaffold-wrote.md:13-16 and :22, which states the tool's output "already carries a `svelte.config.js`" and tables it as "The kit config: the Cloudflare adapter, `csrf: { checkOrigin: false }`". The code confirms the extend page: examples/showcase/.cairn-template.json's `exclude` list does not exclude `svelte.config.js`, so the bake copies examples/showcase/svelte.config.js into every scaffolded repo. docs/reference/doctor.md:21-23 scopes the same fact correctly ("A current `sv create` scaffold writes no `svelte.config.js` at all"). The admin profile's reader arrives only through `create-cairn-site` and "cannot derive an unstated step", so on this page the unscoped sentence is false about their own tree.
```

**Proposed change:**

```text
Scope the sentence to the scaffolder the admin did not use: "a site built from a bare `sv create` scaffold rather than `create-cairn-site` carries no `svelte.config.js` file at all". Add the admin-facing consequence plainly: "If your site came from `create-cairn-site`, it has this file, and this check really did read it."
```

**Kind:** factual


#### Rank 3 — `docs/admin/own-your-domain.md` — UNVERIFIED

**Quoted:**

```text
there. From here, every commit to your default branch deploys itself; this CLI is still what you
run for a cairn engine update, covered in
[Upgrade cairn](../extend/upgrade-cairn.md).
```

**Criterion:**

```text
Contradicted by its own link target: docs/extend/upgrade-cairn.md's five steps are `npm install @glw907/cairn-cms@latest`, reading `Consumers must:` lines, `npx cairn-doctor`, and a typecheck; it never names `create-cairn-site`. `grep -n "upgrade\|update" packages/create-cairn-site/src/args.mjs` returns nothing, so the CLI carries no upgrade path. docs/admin/before-you-start.md:65-66 already classifies "**Updating the cairn engine itself**" as a developer task.
```

**Proposed change:**

```text
Replace the clause with what the two pages already agree on: "From here, every commit to your default branch deploys itself. Updating the cairn engine itself is still a developer's job, not this CLI's; see [Upgrade cairn](../extend/upgrade-cairn.md)."
```

**Kind:** coherence


#### Rank 4 — `docs/README.md` — UNVERIFIED

**Quoted:**

```text
- **A Svelte developer extending a site?** Set the site up with the admin track first, then come back to [the extend track](./extend/README.md) for custom content, admin screens, and everything else past the default.
```

**Criterion:**

```text
States a precondition the extend track denies. docs/extend/build-a-site-by-hand.md:3-5 is "the other route: every file, written by you, so you know exactly what wires to what before you ever hand a decision to a scaffold", and docs/extend/add-cairn-to-a-sveltekit-app.md:6 preconditions on "a SvelteKit app already building against `@sveltejs/adapter-cloudflare`", neither of which runs the admin track. The root README.md carries the same line but mitigates it at :61-63 ("Already have a SvelteKit app..."); docs/README.md carries no such door, so the developer front door offers exactly one path and it is the wrong one for two of the extender profile's ranked jobs ("stand up a site (the tool, then the deep path when they want to own every file)").
```

**Proposed change:**

```text
Split the bullet into the two real doors: "**A Svelte developer extending a site?** Fastest path: run the admin track's setup, then [the extend track](./extend/README.md). Want to own every file, or add cairn to an app you already have? [Build a site by hand](./extend/build-a-site-by-hand.md) and [Add cairn to a SvelteKit app](./extend/add-cairn-to-a-sveltekit-app.md) start from nothing and from an existing app."
```

**Kind:** coherence


#### Rank 5 — `docs/editors/write-in-the-editor.md` — UNVERIFIED

**Quoted:**

```text
The **Insert image** button, and dragging or pasting a picture straight into the text, both start the same flow. See [Add an image](./add-an-image.md) for the details, including alt text, which this page also uses.
```

**Criterion:**

```text
Contract collision: two pages claim the alt-text-authoring job and each defers to the other. docs/editors/add-an-image.md:24-27 sends the reader back ("See [Write in the editor](./write-in-the-editor.md#images) for how to decide between the two and what makes a good description"), while this page's very next paragraph (:96-98) gives that guidance itself ("Write alt text for what the picture contributes where it sits"). The editor profile's success criterion is "the task is done without opening another tab"; a reader following either link makes a round trip and lands where they started.
```

**Proposed change:**

```text
Give alt text one owner. Keep the how-to-write-it guidance here (it already is here) and change add-an-image.md's bullet to stop pointing back: "An **alt text** choice: write a short description of what the picture adds where it sits, or mark it decorative when it carries no information of its own." Then trim this page's pointer to the mechanics only: "See [Add an image](./add-an-image.md) for the upload panel itself."
```

**Kind:** coherence


#### Rank 6 — `docs/editors/publish-and-history.md` — UNVERIFIED

**Quoted:**

```text
If you want someone who isn't an editor to read your unpublished draft, save it first; there's nothing to share until a draft exists. Open Details and select **Share preview link**.
```

**Criterion:**

```text
States an unconditional affordance the engine makes optional. src/lib/components/EditPage.svelte:96-103 documents `previewMint?: boolean` as "Whether the mounting admin facade exposes the `previewMint`/`previewRevoke` actions... a facade that has not applied `migrations/0003_preview.sql`, say, passes `false` to keep the affordance off the edit screen", and docs/extend/share-a-draft-preview.md:7-8 confirms it is "opt-in per site". Every other optional feature in this track is conditioned for the reader (docs/editors/write-in-the-editor.md:125 "If your site has a Fragments screen"; :201 "If your site has an AI copy-edit tool turned on"). The editors track may not link out, so an editor hunting a control that is not there has nowhere to go.
```

**Proposed change:**

```text
Open the section with the same conditional the track already uses elsewhere: "If your site offers preview links, Details carries a **Share preview link** control. (Not every site turns this on; if you don't see it, yours hasn't.)"
```

**Kind:** factual


#### Rank 7 — `docs/extend/rotate-the-github-app-key.md` — UNVERIFIED

**Quoted:**

```text
Your site's GitHub App already exists (`define-an-adapter-and-schema` or the tool that created it set this up), and you can reach that App's settings page under your GitHub account or organization's Developer settings.
```

**Criterion:**

```text
Names a producer page that does not produce the state. docs/extend/define-an-adapter-and-schema.md only consumes an existing App's identity (`appId: '123456'`, `installationId`, lines 89-100) and preconditions itself on the two pages that do the creating. The App is actually created by docs/extend/add-cairn-to-a-sveltekit-app.md ("## Create the GitHub App"), by build-a-site-by-hand.md's Milestone 5, or by the tool at docs/admin/create-your-site.md. The reference is also the only bare unlinked page name in the extend track.
```

**Proposed change:**

```text
Replace the parenthetical with the real producers, linked: "(created by [Add cairn to a SvelteKit app](./add-cairn-to-a-sveltekit-app.md), by [the deep path's Milestone 5](./build-a-site-by-hand.md), or by `create-cairn-site`)".
```

**Kind:** factual


#### Rank 8 — `docs/editors/welcome.md` — UNVERIFIED

**Quoted:**

```text
1. Open your site's sign-in page. Enter the email address your site owner added for you, then select **Send sign-in link**.
```

**Criterion:**

```text
Editor profile, arrival state and success criterion ("The task is done without opening another tab and without asking a developer"). This is step 1 of the track's first page, so no earlier page produces the sign-in page's address, and the track may not link out to get it. docs/admin/invite-editors.md:24-26 tells the admin the address exists ("they go to your site's `/admin`, enter their email"), but no editors-track page ever says it, so an editor whose link expired cannot get back in from this track alone.
```

**Proposed change:**

```text
Name the address pattern in the step, since it is the same on every cairn site: "Open your site's sign-in page: your site's own web address followed by `/admin` (your site owner can confirm it if you're unsure)."
```

**Kind:** procedural


#### Rank 9 — `docs/admin/is-it-working.md` — UNVERIFIED

**Quoted:**

```text
**Ask a developer:** this one needs a code change in two files your site's developer owns. Send them [Build a site by hand](../extend/build-a-site-by-hand.md), which names both edit points.
```

**Criterion:**

```text
The claim "names both edit points" is true only of one section of a 22 KB from-nothing walkthrough, and the link carries no anchor. The section exists: docs/extend/build-a-site-by-hand.md:300 `### Wire the dev backend and the CSRF handoff`, which shows both `src/hooks.server.ts` and the `vite.config.ts` `csrf: { checkOrigin: false }` edit. The same page-level link is used again at :143 for the same fact. The extender profile resents "a doc that requires reading engine source" and skims first; a developer handed the whole walkthrough must find the section themselves.
```

**Proposed change:**

```text
Anchor both links: `[Build a site by hand](../extend/build-a-site-by-hand.md#wire-the-dev-backend-and-the-csrf-handoff)` at :143 and :148.
```

**Kind:** procedural


#### Rank 10 — `docs/README.md` — UNVERIFIED

**Quoted:**

```text
[README](../README.md), [ROADMAP](../ROADMAP.md), [SECURITY](../SECURITY.md), [CHANGELOG](../CHANGELOG.md). The engine's own internal planning and design records, for contributors, live under [internal/](./internal/README.md).
```

**Criterion:**

```text
The docs front door never links `docs/reference/README.md`, on this line or any other, so one of the four published tracks is reachable only through the extend index. Nothing enforces it: scripts/checks/check-arm-indexes.mjs's FRONT_DOOR_PAGES (lines 37-39) covers only `docs/why-cairn.md`. The extender profile arrives "through npm, GitHub, or the root README" and skims; the API reference is the surface that reader is most likely to want first.
```

**Proposed change:**

```text
Add a sixth routing line under "Where to start": "- **Looking up an export, a CLI flag, or a log event?** [The reference](./reference/README.md) is one page per package subpath, plus the CLI commands."
```

**Kind:** coherence


#### Rank 11 — `docs/admin/README.md` — UNVERIFIED

**Quoted:**

```text
5. **[Setup recovery](./setup-recovery.md)** — a setup step failed or was interrupted; get back on the path.
```

**Criterion:**

```text
The list is titled "## The journey, in order", but this entry recovers steps 2 and 3 and is numbered after step 4's post-setup verification; docs/admin/own-your-domain.md:17-18 already sends the reader to it mid-step-3. The order is load-bearing beyond the page: cairn-pub's loader derives each arm's prev/next chain from the index's own list order (src/lib/docs/loader.ts, `parseArmLinkOrder` then `chainLinks`), so a first-time reader clicking "next" from own-your-domain passes two failure routers before reaching invite-editors.
```

**Proposed change:**

```text
Reorder to 1 before-you-start, 2 create-your-site, 3 own-your-domain, 4 setup-recovery, 5 is-it-working, 6 invite-editors, 7 troubleshooting, and retitle the section "The journey, and where to go when it stalls" so the two routers are not sold as journey steps.
```

**Kind:** coherence


#### Rank 12 — `/home/glw907/Projects/cairn-pub/_redirects` — UNVERIFIED

**Quoted:**

```text
/docs/explanation /docs/extend 301
```

**Criterion:**

```text
Of the two one-to-many calls the file's own header flags, I agree with both targets: `/docs/guides` to `/docs` is right (all three inheriting indexes are named in that page's first screenful, so any single track index would strand two thirds of the traffic), and `/docs/explanation` to `/docs/extend` is the right page. The refinement is the landing position: the six pages that index inherited sit under `## Concepts` at docs/extend/README.md:82, the seventh of eight sections on a 132-line index, below the deep path, building blocks, admin surfaces, design, publishing flow, and the stability statement.
```

**Proposed change:**

```text
Point the rule at the inherited grouping: `/docs/explanation /docs/extend#concepts 301`. The heading already renders as `#concepts`, and a fragment in a `_redirects` destination rides through in the `Location` header.
```

**Kind:** procedural


#### Rank 13 — `docs/reference/doctor.md` — UNVERIFIED

**Quoted:**

```text
[Cloudflare readiness page](../admin/is-it-working.md) is the manual walkthrough of the same list, one section per condition.
```

**Criterion:**

```text
The link label names a page that no longer exists. The target's own H1 is "# Is it working?" (docs/admin/is-it-working.md:1), and the manifest's redirect map records `docs/guides/cloudflare-readiness.md` as "the doctor-organized readiness page, renamed". This is the only surviving reference to a retired page title in the shipping tree (grep over admin, editors, extend, reference, README.md, why-cairn.md returns this one line).
```

**Proposed change:**

```text
Match the label to the page: "[Is it working?](../admin/is-it-working.md) is the manual walkthrough of the same list, one section per condition."
```

**Kind:** factual


#### Rank 14 — `docs/admin/before-you-start.md` — UNVERIFIED

**Quoted:**

```text
Building and running a cairn site is free, and stays free, for as long as you are the only person who ever signs in. Three things stand between you and a finished setup, and only one of them is money.
```

**Criterion:**

```text
The enumeration is incomplete against the track it fronts. docs/admin/own-your-domain.md:118-123 introduces a fourth admission price this section never names: "a fresh one, prefilled with eight permissions rather than the domain half's five... It's scoped across every Cloudflare account and zone you own, so treat anyone who can push to your default branch as able to read a token that reaches all of them." docs/why-cairn.md:81 sends the evaluator here calling it "the complete cost picture", and the admin profile's counterpart question is "is any cost or prerequisite revealed after the step that incurs it?"
```

**Proposed change:**

```text
Make item 3 plural and carry the scope warning forward: "**Two Cloudflare API tokens you create yourself, at no cost, but read every row before you save either.** One covers connecting your domain and turning on sign-in email; a second, wider one is needed only if you connect Workers Builds, and it reaches every Cloudflare account and zone you own. [Own your domain](./own-your-domain.md) covers both when you get there."
```

**Kind:** coherence


#### Rank 15 — `docs/reference/admin-grammar-tokens.md` — UNVERIFIED

**Quoted:**

```text
# Reference: admin grammar tokens
```

**Criterion:**

```text
This is the only reference page whose H1 carries an arm prefix; its twenty-three siblings name the subject alone ("# Ambient types (`/ambient`)", "# Islands (`@glw907/cairn-cms/islands`)", "# The `cairn-doctor` CLI"). docs/reference/README.md:36 labels it "[Admin grammar tokens]" without the prefix, and cairn-pub's loader takes the page title from the H1 (src/lib/docs/loader.ts, `renderPage` returns `h1.text` as `title`), so the rendered page reads "Reference: admin grammar tokens" under a "Docs > Reference" breadcrumb and in its neighbours' prev/next links.
```

**Proposed change:**

```text
Drop the prefix: "# Admin grammar tokens", matching the index label and the arm's other twenty-three H1s.
```

**Kind:** coherence


### Stage 4: the register pass

### Register pass (16 findings, 0 verified)

16 findings, all UNVERIFIED (the verify stage drew only from the claims sweeps).

**Coverage note:**

```text
Read in full: docs/internal/docs-register.md, docs/internal/record/2026-08-14-audience-profiles.md, all 8 docs/admin pages, all 8 docs/editors pages, all 31 docs/extend pages, docs/why-cairn.md, docs/README.md. For docs/reference I read the index plus the lede of every export-keyed page (15 pages), per the brief's instruction to hold reference to its lede and tables only; I did not read the reference tables or signature blocks, so nothing below rank 3 covers that track.

Mechanical checks run across all four targets, all clean and worth recording as negative results: (1) the editors banned-vocabulary list (repo, commit, branch, merge, deploy, build, frontmatter, markdown syntax names, every Cloudflare/GitHub/git/npm noun, plus DNS, nameserver, YAML, heading-level names) returns zero hits across all 8 pages, including the two verbatim UI quotes that could have leaked ("The live site is rebuilding" is the editor's own string, correctly quoted rather than paraphrased); (2) the editors track's no-outbound-links rule holds, every link in the track is `./`-relative; (3) no page anywhere cites Diátaxis, its terminology, or its arm names, with the single "how-to" at rank 14 the nearest approach; (4) spaced em dashes appear only in index gloss-dashes and the is-it-working jump list, never as a sentence-final elaborative tail, so the em-dash-rhythm tell is absent; (5) no setup-colon triad survives anywhere; (6) the admin engine-internal-name scan surfaced exactly one true breach (rank 1) against SvelteKit/svelte.config.js/D1 mentions that are all inside "Ask a developer" remedies where the contract permits them.

What I could not check: I did not run Vale, `npm run check:reference`, `check:readiness`, or any gate, so anchor-slug/condition-registry agreement and Vale-floor conformance are unverified. I did not verify prose claims against engine source, so factual correctness of the extend concept pages is out of scope here (that is stages 1-3). Two things I deliberately did not fire on, so the conductor knows they were considered and cleared: the editors README's unspaced gloss dashes ("**[Welcome](./welcome.md)**—what this editor is") are a list convention, not the banned rhythm; and configure-rendering.md's "There's no second render path to keep in sync, because there is no second render path" is emphatic and true rather than circular padding. The editors track and the extend concept pages (architecture, content-model, security-model, render-safety, auth-channel-security-model) are the strongest material in the corpus and produced no findings between them beyond rank 13 and 14.
```

#### Rank 1 — `docs/admin/is-it-working.md` — UNVERIFIED

**Quoted:**

```text
This same condition id also covers two other checks: a media bucket your site's adapter declares but `wrangler.jsonc` doesn't (only on a site with an image library), and a tidy AI key binding.
```

**Criterion:**

```text
docs-register.md, the admin track vocabulary contract: "Banned: adapter, seam, schema, frontmatter, island, runes, TypeScript, any engine-internal name." `adapter` is the first word on the admin track's banned list, and this is the only leak in the whole track.
```

**Proposed change:**

```text
Replace `adapter` with the reader-facing noun the rest of the track uses: "a media bucket your site's configuration declares but `wrangler.jsonc` doesn't". (While in the same file, `config.site-config-invalid` at line 163 says "your site's content concepts can't be resolved at all"; `concepts` is a product term the admin reader has met nowhere, and "your site's content settings can't be read at all" costs nothing.)
```

**Kind:** vocabulary


#### Rank 2 — `docs/extend/README.md` — UNVERIFIED

**Quoted:**

```text
Eight terms carry a precise meaning across this track and the reference. Nothing else here is jargon to avoid; these eight are jargon to use precisely, defined once here:
```

**Criterion:**

```text
docs-register.md universal contract, "No prose about the docs' own writing," and its named killed specimen: "'Eight words the docs use precisely' as the vocabulary intro. The docs admiring their own writing." The heading was made plain (`## Vocabulary`) but the killed sentence survived into the body in near-identical form, count and all.
```

**Proposed change:**

```text
Cut the meta-commentary and state the fact the reader needs: "These terms name real objects in the system, and the reference pages use them in exactly this sense:". Drop "Eight" entirely; it is both self-admiring and a number that rots the first time a ninth term joins the list.
```

**Kind:** register


#### Rank 3 — `docs/reference/core.md (also delivery.md, render.md, media.md, islands.md, vite.md, auth-store.md, auth-crypto.md, auth-channel.md, components.md, admin-toolkit.md)` — UNVERIFIED

**Quoted:**

```text
Anything proposed here must be construction surface a `cairn.config.ts` builds with, or a read helper a site's own route calls directly; a SvelteKit route factory belongs on
```

**Criterion:**

```text
2026-08-14-audience-profiles.md, "How to grade with a profile": "A page serving two profiles is two pages or one wrong one." The reference is the extend and admin tracks' shared lookup surface; "anything proposed here must be" addresses the engine contributor deciding what belongs on a subpath, and the contributor zone is `CONTRIBUTING.md` and `docs/internal/`, which "is unpublished." Eleven reference ledes carry this clause or the equivalent "membership rule"/"charter" framing.
```

**Proposed change:**

```text
Keep the descriptive half of each lede and move the membership rule to the contributor zone (a single subpath-charter table in `docs/internal/`), leaving the published lede as "what the shape is and why it exists" per the reference-entry anatomy. On core.md: end the lede at "A site imports it at `src/lib/cairn.config.ts` and in its admin and delivery code," and let the cross-reference to the SvelteKit page stand on its own without the proposal rule.
```

**Kind:** register


#### Rank 4 — `docs/extend/build-a-site-by-hand.md` — UNVERIFIED

**Quoted:**

```text
You'll need Node 22 or later, a GitHub account, and a Cloudflare account (the free tier covers everything through Milestone 3; Milestone 5 needs Workers Paid, named at the point it matters).
```

**Criterion:**

```text
Task/tutorial anatomy in docs-register.md: "preconditions stated with links to whatever produces them." The page promises the cost is "named at the point it matters," and Milestone 5 never names it: it says only "a sign-in actually sends an email" and delegates to add-cairn-to-a-sveltekit-app.md, which does not mention Workers Paid or $5 either. The deep path therefore reveals the paid-plan requirement nowhere.
```

**Proposed change:**

```text
Add one sentence at the head of Milestone 5, before the account setup: "Sending a real sign-in email needs Cloudflare's Workers Paid plan, $5 a month, billed once per Cloudflare account; see [the free-until boundary](../admin/before-you-start.md#the-free-until-boundary)." Either that, or drop the "named at the point it matters" promise from the preconditions.
```

**Kind:** procedural


#### Rank 5 — `docs/admin/own-your-domain.md` — UNVERIFIED

**Quoted:**

```text
This is the first of the two admission prices on this page: paste the finished token back, and read every row before you do, the same warning [Before you start](./before-you-start.md) opens with.
```

**Criterion:**

```text
docs-register.md universal contract, "No coined metaphor in a definitional or structural position... it may not define what something is or name the docs' own anatomy." "Admission price" both defines what the token is (X is a Y) and organizes the page ("the two admission prices on this page", repeated at line 118). It also collides with the admin profile's top-ranked anxiety, "money surprises": a price metaphor sits inches from the real $5 charge and the real domain purchase, on a step that the page itself says "Costs nothing."
```

**Proposed change:**

```text
State it plainly: "This step needs a Cloudflare API token you create yourself, at no cost: paste the finished token back, and read every row before you do..." and at line 118, "That token is the second one this page needs, separate from the first: a fresh one, prefilled with eight permissions...".
```

**Kind:** register


#### Rank 6 — `docs/extend/data-tiers.md` — UNVERIFIED

**Quoted:**

```text
The media manifest keys by content hash rather than by concept and id, and carries exactly what the bytes themselves can't: a display name, alt text, the original filename, and known pixel dimensions.
```

**Criterion:**

```text
docs-register.md keystone: "the reader should come away impressed by the quality of the thought and the professionalism of the prose." This sentence restates line 54 of the same page eleven lines earlier, verbatim from the colon on: "Each manifest row carries what the bytes themselves can't: a display name, alt text, the original filename, and known pixel dimensions." A reader who notices reads it as an unedited draft.
```

**Proposed change:**

```text
Delete the second occurrence. The paragraph's real point survives intact: "R2 exists specifically because git is the wrong place for binary asset bytes at any real scale, and D1 is the wrong place for anything measured in megabytes. Both manifests are committed JSON under `src/content/.cairn/`. Only the bytes they describe live in a different tier."
```

**Kind:** coherence


#### Rank 7 — `docs/admin/create-your-site.md` — UNVERIFIED

**Quoted:**

```text
Say yes, and it installs your site's dependencies, signs in to Cloudflare (a third browser trip, only if you aren't signed in already), and deploys.
```

**Criterion:**

```text
docs-register.md, the admin track vocabulary contract: "Defined on use: DNS and nameservers, zone, deploy, Workers (as \"where your site runs\"), D1/R2 only if a step shows them." `deploy` is the one defined-on-use term the track never defines. Its siblings are all honored: `zone` is glossed at own-your-domain.md:24, `DNS` at :46, `Worker` at create-your-site.md:51, and `your repository` gets the contract's exact gloss at before-you-start.md:11.
```

**Proposed change:**

```text
Gloss it at this first use, where the tool actually does it: "...and deploys, meaning it puts your site on the internet at a live address." One apposition covers every later `deploy`/`redeploy` in the track.
```

**Kind:** vocabulary


#### Rank 8 — `docs/admin/setup-recovery.md` — UNVERIFIED

**Quoted:**

```text
| You declined connecting to Workers Builds | Nothing is wrong; deploys still go through this CLI. | **Act whenever you're ready:** re-run the command with `--connect`. |
```

**Criterion:**

```text
docs-register.md, the admin track vocabulary contract: "Free: command, terminal, account, dashboard, domain, email, sign in, your repository." `CLI` is not on that list and is never glossed; the profile's reader "cannot derive an unstated step." The track otherwise says "the tool" or "the command" consistently, so this reads as a slip rather than a choice. It recurs at own-your-domain.md:134, "this CLI is still what you run for a cairn engine update."
```

**Proposed change:**

```text
Use the track's own word in both places: here, "deploys still go through the `create-cairn-site` command"; at own-your-domain.md:134, "the `create-cairn-site` command is still what you run for a cairn engine update."
```

**Kind:** vocabulary


#### Rank 9 — `docs/extend/rotate-the-github-app-key.md` — UNVERIFIED

**Quoted:**

```text
1. **Generate a new key.** On the App's settings page (Developer settings → GitHub Apps → your App → General), generate a new private key and download the `.pem` file.
```

**Criterion:**

```text
docs-register.md universal contract, "A vendor's specifics get a link, never a copy... console walkthroughs... sit behind a link to the vendor's own page." The page states this rule about itself seven lines earlier and then breaks it: "See GitHub's own [managing private keys for GitHub Apps]... for the exact settings-page navigation; this page covers cairn's own half." A page that announces a boundary and then crosses it costs the reader's trust in both halves.
```

**Proposed change:**

```text
Drop the breadcrumb trail and keep the cairn-owned instruction: "**Generate a new key.** Following [GitHub's own guide](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps), generate a new private key on the App and download the `.pem` file. Leave the old key in place; do not delete it yet."
```

**Kind:** register


#### Rank 10 — `docs/extend/add-cairn-to-a-sveltekit-app.md` — UNVERIFIED

**Quoted:**

```text
On the App's settings page, note the **App ID**, near the top. Scroll to **Private keys** and click **Generate a private key**; your browser downloads a `.pem` file.
```

**Criterion:**

```text
docs-register.md universal contract, "A vendor's specifics get a link, never a copy," and the reason given there: "vendors rename dashboard sections and move features between tiers without telling anyone." The page already links GitHub's registration guide at line 20 and calls it "the authority on the form itself." Lines 23-29 are legitimately cairn's own requirements; "near the top," "Scroll to," and "Still on the App's settings page, go to **Install App**" (line 40) are pure GitHub UI navigation that goes stale silently.
```

**Proposed change:**

```text
Name the values, not the route to them: "From the App's settings page, collect two things: the **App ID**, and a newly generated private key (a downloaded `.pem` file)." Same at line 40: "Install the App on the account that owns your content repository, choosing the specific repository. GitHub's redirect URL ends in the **Installation ID**: `https://github.com/settings/installations/<installation_id>`."
```

**Kind:** register


#### Rank 11 — `docs/reference/README.md` — UNVERIFIED

**Quoted:**

```text
A drifted signature fails the build red.
```

**Criterion:**

```text
docs-register.md keystone, the flat-and-perfunctory half: "Flat, featureless prose that merely avoids marketing is not the target; it is the other way to fail." This sentence restates the immediately preceding clause of the same sentence pair ("so a signature that drifts from the code fails the build") and adds only the word "red," which carries no information the reader can act on. It sits on the front door of the corpus's most-read track.
```

**Proposed change:**

```text
Delete the sentence. The preceding one already says it once, precisely.
```

**Kind:** coherence


#### Rank 12 — `docs/admin/setup-recovery.md` — UNVERIFIED

**Quoted:**

```text
| The connection and trigger exist, but the config commit or the first build hasn't finished | The reconcile commit needs a sign-in click, or the build simply hasn't appeared or finished yet. |
```

**Criterion:**

```text
docs-register.md, the admin track vocabulary contract: "Banned: ... any engine-internal name," and the profile's counterpart question, "is any step's success dependent on knowledge the page did not state?" "The reconcile commit" is the tool's internal name for a step this reader has met only as a plain-language description, at own-your-domain.md:128: "a sign-in click when the tool commits its own deploy-config changes back to your repository under your name."
```

**Proposed change:**

```text
Use the description the reader already has: "The commit that writes your deploy settings back to your repository needs a sign-in click, or the build simply hasn't appeared or finished yet."
```

**Kind:** vocabulary


#### Rank 13 — `docs/editors/write-in-the-editor.md` — UNVERIFIED

**Quoted:**

```text
- **Zen** clears away the toolbar and every button, leaving just your writing. Press Escape, or the same shortcut, to bring the chrome back.
```

**Criterion:**

```text
2026-08-14-audience-profiles.md, the editor profile: "assume no technical vocabulary survives from their day job," and its counterpart question, "does any sentence assume otherwise?" "Chrome" is interface jargon, and to this reader it most likely names a browser. It is also the one undefined term on an otherwise exemplary page, which the same sentence has already glossed in plain words a clause earlier.
```

**Proposed change:**

```text
Reuse the page's own phrasing: "Press Escape, or the same shortcut, to bring the toolbar and buttons back."
```

**Kind:** vocabulary


#### Rank 14 — `docs/extend/auth-channel-security-model.md` — UNVERIFIED

**Quoted:**

```text
This page stands alone deliberately: a security contract for code that authenticates real people needs to stay findable on its own, not buried inside a how-to. [Add a second audience](./add-a-second-audience.md) is the task guide; this page is what to trust and why.
```

**Criterion:**

```text
docs-register.md universal contract: "No prose about the docs' own writing," and "this document may name the forms (task guide, reference, and so on) for its own internal organization, since it is read by writers and reviewers, not shipped to a reader." "Task guide" is the anatomy name from the internal standard, printed on a shipped page; "how-to" is a Diátaxis arm name. The reader needs the routing, not the editorial rationale for it.
```

**Proposed change:**

```text
Keep the routing, drop the self-narration: "[Add a second audience](./add-a-second-audience.md) walks through wiring `createAuthChannel` into real routes. This page is the security contract behind it: what to trust and why."
```

**Kind:** register


#### Rank 15 — `docs/why-cairn.md` — UNVERIFIED

**Quoted:**

```text
**cairn is pre-1.0, and seams still move.** The package is at `0.94.0` today, and the extend track's own stability section documents a seam that moved across two separate minor releases already, inside the tier meant to stay frozen.
```

**Criterion:**

```text
docs-register.md universal contract: "Every factual claim is literally true." This one is true only until the next publish, on the page whose whole authority rests on being the honest account. The same page has no other pinned number, and extend/README.md makes the identical point durably by naming the versions that broke (`0.86.0`, `0.94.0`) rather than the current one.
```

**Proposed change:**

```text
Drop the pin and let the durable fact carry it: "**cairn is pre-1.0, and seams still move.** The extend track's own stability section documents a seam that moved across two separate minor releases already, inside the tier meant to stay frozen." The current version is one `npm view` away and belongs nowhere in prose.
```

**Kind:** factual


#### Rank 16 — `docs/extend/add-a-second-audience.md` — UNVERIFIED

**Quoted:**

```text
An instructor invited this way is still added and removed through [`ManageEditors`](../admin/invite-editors.md): the role selector renders your declared vocabulary once it's larger than the default owner/editor pair.
```

**Criterion:**

```text
docs-register.md, the extend track vocabulary contract: "Nothing is banned; imprecision is." `ManageEditors` is a component name (it is documented as such on `reference/components.md` and `reference/auth-store.md`), used here as the link text for an admin-track how-to about a screen at `/admin/editors`. The reader following the code-formatted symbol lands on operator prose about inviting people, not on the component's contract.
```

**Proposed change:**

```text
Name the screen, not the component: "An instructor invited this way is still added and removed from the `/admin/editors` screen (see [Invite your editors](../admin/invite-editors.md)): the role selector renders your declared vocabulary once it's larger than the default owner/editor pair." The link text at line 14 has the same mismatch, calling the page "Invite editors" when its title is "Invite your editors."
```

**Kind:** vocabulary


## The refutations, with their reasoning

Two findings did not survive independent verification. Both came from the `docs/editors`
claims sweep. Recording the reasoning here, and not only inline above, because a gate that never
refutes anything is not verifying; these are the proof it did.

### `docs/editors/README.md`, claims:editors rank 4

**Original finding, quoted:**

```text
If you came from the **Get help** link inside the editor, you're in the right place.
```

**Criterion originally claimed:**

```text
No control named "Get help" leads here. The admin's sidebar item is labelled **Help** and points at `/admin/help` (src/lib/sveltekit/admin-nav.ts:404 `help: { label: 'Help', href: '/admin/help' }`). The one control literally labelled "Get help" is the Help screen's conditional support link (HelpHome.svelte:329-335), which renders only when the site configures a support URL and opens the site's own contact, not this documentation. The editor profile's arrival clause names "the admin's Help link", not a Get help link.
```

**Originally proposed change:**

```text
Name the control that exists: "If you came here from the **Help** link in your site's sidebar, you're in the right place." If the intended path is the Help screen linking out to these pages, that link has to be built before the sentence can claim it.
```

**Verdict: REFUTED**

**Why it did not survive:**

```text
The quoted line exists verbatim (docs/editors/README.md:3-4: "If you came from the **Get help** link inside the editor, you're in the right place."), but both empirical claims behind the finding are false.

CLAIM 1 — "renders only when the site configures a support URL." False. The runtime composes a default. src/lib/content/compose.ts:18 `const DEFAULT_SUPPORT_CONTACT = 'https://cairn.pub/help';` and :44 `supportContact: adapter.editor?.supportContact ?? DEFAULT_SUPPORT_CONTACT`. So every site that sets nothing gets the link; the component's own contract comment says so (HelpHome.svelte:15-18: "The runtime composes a default here (cairn's hosted editor help) when a site sets no `editor.supportContact`"). HelpHome.svelte:76-83 classifies `https://cairn.pub/help` as `kind: 'url'`, which is exactly the branch that renders the anchor whose text is "Get help" (HelpHome.svelte:329-337). The email override renders "Email support" instead, not "Get help".

CLAIM 2 — "opens the site's own contact, not this documentation." False in the default case: the default href IS this documentation. docs/editors is shipped in the package (package.json:171 `"docs/editors"`), and cairn.pub renders it at /help — docs/superpowers/specs/2026-08-09-docs-refactor-brief.md:82-83 ("The admin's Help home carries a 'Get help' hand-off whose default is `DEFAULT_SUPPORT_CONTACT = 'https://cairn.pub/help'`") and :116 ("cairn.pub/help is live, the admin links to it by default"); 2026-08-09-admin-setup-and-docs-reset-design.md:14 ("The editor ... Served: six guides, delivered through cairn.pub `/help` and the admin's Get help link").

EXECUTED: `npx vitest run src/tests/component/help-home.test.ts -t "hosted-help default"` — 1 passed. The test (src/tests/component/help-home.test.ts:58-64) renders with `supportContact: 'https://cairn.pub/help'`, asserts a link with accessible name /Get help/ and `href="https://cairn.pub/help"`. The reader of docs/editors/README.md on cairn.pub/help is, by construction, someone who followed that link.

The profile does not contradict the page either: docs/internal/record/2026-08-14-audience-profiles.md:40 reads "Through the admin's Help link (cairn.pub/help)" — its own parenthetical names the docs destination, not /admin/help.

The proposed change would make the page LESS true. admin-nav.ts:404 `help: { label: 'Help', href: '/admin/help' }` is correct as a citation, but that sidebar Help link opens the in-admin Help home screen, not this documentation tree. Rewriting the sentence to "If you came here from the **Help** link in your site's sidebar" would assert a path that does not lead here, replacing an accurate statement with a false one.
```

**What, if anything, is real:**

```text
None. The only residual is that a site overriding `editor.supportContact` with an email or free text gets "Email support" or no link, but the sentence is conditional ("If you came from...") and such a reader would not arrive at cairn.pub/help by that route anyway.
```

### `docs/editors/manage-the-media-library.md`, claims:editors rank 9

**Original finding, quoted:**

```text
The library accepts JPEG, PNG, WebP, and GIF pictures directly.
```

**Criterion originally claimed:**

```text
AVIF is a first-class accepted type and is missing from an enumeration that add-an-image.md links to as the authority ("For which file types the editor accepts, see Manage the media library#accepted-image-types"). src/lib/media/config.ts:37 `DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']`; the sniffer recognizes the AVIF brands (media/sniff.ts:76-84) and media/sniff.ts:98-102 maps it to its own stored extension.
```

**Originally proposed change:**

```text
Add it: "The library accepts JPEG, PNG, WebP, GIF, and AVIF pictures directly."
```

**Verdict: REFUTED**

**Why it did not survive:**

```text
The quoted line is real and in context: docs/editors/manage-the-media-library.md:33, under "## Accepted image types" (line 31), followed at line 34 by "It also accepts HEIC, the format many phone cameras use, and converts it for you automatically."

The finding's source citations are accurate but exclusively server-side. src/lib/media/config.ts:37 does include 'image/avif' in DEFAULT_ALLOWED_TYPES; src/lib/media/sniff.ts:30,82 recognizes the 'avif'/'avis' ISO-BMFF brands; sniff.ts:100 maps image/avif to the 'avif' extension. The sole consumer of allowedTypes is src/lib/sveltekit/content-routes-media.ts:520.

The refutation is the client ingest path, which the finding never examined. Every editor upload runs through ingestFile BEFORE any request reaches that server check. Call sites: src/lib/components/CairnMediaLibrary.svelte:408 and :647 (the media library this very page documents), src/lib/components/MediaInsertPopover.svelte:232, src/lib/components/MediaHeroField.svelte:288. There is no other upload entry point and no bypass.

src/lib/components/client-ingest.ts ingestFile has exactly three accepting branches:
  - sniffed === 'image/gif' -> passthrough (dimensions from GIF header)
  - sniffed === 'image/jpeg' || 'image/png' || 'image/webp' -> passthrough
  - detectHeic(bytes) -> lazy heic-to decode, re-encoded to WebP
An AVIF sniffs to 'image/avif', matches none of the three (detectHeic at client-ingest.ts:28 is `sniffMediaType(bytes) === 'image/heic'`, false for AVIF), and falls through to `throw new IngestError('decode-unsupported')` at the function tail. The module's own doc comment at client-ingest.ts:285-288 states the taxonomy: "Web-native types (JPEG, PNG, WebP) pass through ... GIF passes through ... HEIC routes through the lazy-loaded heic-to decoder."

The page therefore enumerates the ingest tiers exactly: four accepted directly (JPEG, PNG, WebP, GIF), one converted (HEIC). It matches ingestFile branch for branch and is complete for its audience.

The proposed change would make the page LESS true. An editor who reads "accepts ... AVIF pictures directly" and drops an AVIF receives a decode-unsupported failure card (src/lib/components/media-upload-outcome.ts:53 maps unsupported_type -> 'decode-unsupported'). That trades an accurate statement for a tidier-looking false one.

The editor-facing scope is confirmed by the cross-reference the finding itself cites: docs/editors/add-an-image.md:32-33 reads "For which file types the editor accepts, see Manage the media library#accepted-image-types." The editor is the explicit subject, and AVIF is precisely what the editor cannot upload.

Test coverage corroborates the split: 'avif' appears in src/tests/unit/media-sniff.test.ts, media-seed.test.ts, media-store.test.ts and media-config.test.ts, and in no client-ingest test.
```

**What, if anything, is real:**

```text
No docs defect exists on this page; the page is accurate as written and the proposed edit would introduce a false statement. What is genuinely there is a code-level inconsistency, out of scope for this docs gate: DEFAULT_ALLOWED_TYPES (src/lib/media/config.ts:37) permits image/avif, but no editor upload path can ever produce one, since ingestFile rejects AVIF as decode-unsupported. AVIF is reachable only through developer-side paths - the seeding assembler (src/lib/media-seed/assemble.ts:92) and delivery of already-stored objects (src/lib/sveltekit/media-route.ts:25 DELIVERY_EXTS). If anything should change, it is either the engine (add an AVIF passthrough branch to ingestFile, since AVIF is web-native and createImageBitmap decodes it in current browsers) or a note in the extend track about the server allow-list exceeding what the editor UI can submit. Neither belongs in docs/editors/manage-the-media-library.md.
```

## Dispositions

Filled in at Pass D's close-out (2026-08-14), from the five fold-workflow reports (`fold:admin`,
`fold:editors`, `fold:extend`, `fold:reference`, `fold:front-doors`) and the eight second-round
verify reports (`verify:<slice>`, the ones this record's coverage table marks unverified), all in
`wf_24b32c77-f45`. Every disposition below was checked against the current tree, not merely
copied from a fold agent's own summary.

**Headline correction to the fold, found while writing this section.** Each fold agent was
dispatched with an explicit instruction to also act on the original 24 first-round verdicts
("the gate's own 24 verdicts are already recorded... read the record for those"), on top of the
second-round JSON batch it was handed. The `docs/admin` fold did this (all 13 of its claims-sweep
findings, including the one left unverified, are folded below). The `docs/editors` and
`docs/extend` folds did not: `docs/editors` folded zero of its ten first-round claims findings
(eight needed action; two were REFUTED), and `docs/extend` folded one of its two
(`build-a-site-by-hand.md` rank 2, the `ORIGIN` fix, landed; rank 1, the broken permalink example,
did not). All nine were still present in the tree exactly as the gate quoted them, found by
grepping the current pages for each finding's quoted text during this close-out rather than by
reading the fold reports, which claimed completion.

**All nine were then re-folded (2026-08-14), each independently verified by grep**, so none is
outstanding. The conductor overrode the close-out's original disposition of filing them to
`ROADMAP.md`: they are confirmed defects in the corpus this pass exists to make correct, and
filing them would have shipped nine known-wrong statements. The re-fold dispatches carried a
proof requirement, that each agent grep for its finding's quoted text and show zero hits, which
is the check the first round lacked.

The standing lesson is cheap to apply: a fold report is a claim, and confirming that a fold
landed costs one grep against the text the finding said was there. `docs/reference` carried no
first-round findings, so it has no equivalent gap.

### Stage 1: the claims sweep

#### `docs/admin` (13 findings)

All 13 folded by `fold:admin`, verified in the tree.

- **Rank 1** (own-your-domain.md, Workers Paid prerequisite) — CONFIRMED — FOLDED: a sentence
  ahead of the prompt states the dependency, softened to "the run stops" per the verifier's own
  caveat rather than promising a specific dashboard redirect; a matching row added to
  `setup-recovery.md`'s domain table.
- **Rank 2** (is-it-working.md, CSRF condition ids wrongly implied doctor-emitted) — CONFIRMED —
  FOLDED: the jump list now cites the `guard.rejected` reason field rather than claiming doctor
  coverage.
- **Rank 3** (create-your-site.md, dropped `administration:write`/repo-deletion disclosure) —
  CONFIRMED — FOLDED: the record's own verbatim rewrite restored.
- **Rank 4** (own-your-domain.md, unexecutable DMARC instruction) — CONFIRMED — FOLDED: rewritten
  to name SPF/DKIM as the real mechanism. Its code-side twin (the identical string in
  `create-cairn-site`'s own CLI closing copy and README) was out of scope for a docs fold and is
  now filed to ROADMAP (Now tier).
- **Rank 5** (is-it-working.md, svelte.config.js gap over-generalized to every scaffold) —
  CONFIRMED — FOLDED: scoped to hand-built sites only; a `create-cairn-site` site always has the
  file.
- **Rank 6** (troubleshooting.md, Publish-button-disappeared misattributed to the rare cause) —
  CONFIRMED — FOLDED: rewritten to lead with the common case (nothing pending) before the
  `github.unreachable` case.
- **Rank 7** (is-it-working.md, Cloudflare token wrongly said to live in the Worker) — CONFIRMED —
  FOLDED: split into a run-it-yourself (Cloudflare) / can't-run-it-at-all (GitHub App key,
  write-only Worker secret) explanation, this pass's fix for the failed persona walk.
- **Rank 8** (is-it-working.md, undisclosed `--send-test` opt-in) — CONFIRMED — FOLDED: disclosed
  inline; the misplaced duplicate sentence under "Probe the deployed admin" removed.
- **Rank 9** (is-it-working.md, `auth.store-unreachable` Act step promises what a re-run can't do
  on an already-live site) — CONFIRMED — FOLDED: rewritten to the developer-facing `wrangler d1
  execute`/seed remediation sourced from the condition's own string, since the verifier found the
  check can only fail on a hand-wired site in the first place.
- **Rank 10** (create-your-site.md, missing $6/month all-in figure) — NARROWED — FOLDED as
  narrowed: the figure added; the "drop the equivalence claim" half of the proposal declined
  (that sentence was already true).
- **Rank 11** (is-it-working.md, "adapter" the one banned term in the track) — UNVERIFIED in the
  gate itself — FOLDED via its duplicate, register rank 1 (CONFIRMED): "adapter" dropped.
- **Rank 12** (own-your-domain.md, browser-moment count contradicts its own prerequisite list) —
  CONFIRMED — FOLDED: made conditional on prior GitHub-App authorization, per the verifier's
  wording precisions.
- **Rank 13** (invite-editors.md, "every person is owner or editor" ignores custom roles) —
  CONFIRMED — FOLDED in all three places the verifier found the claim repeated, not only the one
  originally quoted.

#### `docs/editors` (10 findings)

**Eight of ten NOT FOLDED** (see the headline correction above); the two REFUTED findings needed
no action.

- **Rank 1** (when-something-goes-wrong.md, quoted refusal heading never the visible banner text)
  — CONFIRMED — **NOT FOLDED by the first fold round; FOLDED in the re-fold (2026-08-14), verified by grep.**
- **Rank 2** (write-in-the-editor.md, decorative body image never actually clears the needs-alt
  flag) — CONFIRMED — **NOT FOLDED by the first fold round; FOLDED in the re-fold (2026-08-14), verified by grep.**
- **Rank 3** (publish-and-history.md, Publish-site button absent while an entry is open, page
  states only the pending-count condition) — NARROWED — **NOT FOLDED by the first fold round; FOLDED in the re-fold (2026-08-14), verified by grep.** The verifier's own
  narrowing (the sentence is incomplete, not false; "the editor" denotes the whole admin app in
  this track's vocabulary) should govern the eventual fix. Filed to ROADMAP.
- **Rank 4** (README.md, "Get help" link claimed to render conditionally and open the site's own
  contact) — REFUTED. Both empirical claims were false: the runtime composes a default support
  contact (`cairn.pub/help`, this documentation tree itself), so the sentence is accurate as
  written. No action; the proposed rewrite would have made the page false.
- **Rank 5** (manage-the-media-library.md, promised "you'll see that up front" display-breakage
  warning on replace has no code referent) — CONFIRMED — **NOT FOLDED by the first fold round; FOLDED in the re-fold (2026-08-14), verified by grep.**
- **Rank 6** (manage-the-media-library.md, bulk-delete keyboard chords with no pointer path named)
  — CONFIRMED — **NOT FOLDED by the first fold round; FOLDED in the re-fold (2026-08-14), verified by grep.** The verifier found the gap worse than raised (the library's list
  view has no keyboard model at all; the per-row checkbox is the only path). Filed to ROADMAP.
- **Rank 7** (manage-the-media-library.md, unconditional typed-confirm gate on Replace
  undocumented) — NARROWED — **NOT FOLDED by the first fold round; FOLDED in the re-fold (2026-08-14), verified by grep.** The verifier refuted the "dead button" framing and
  the "same as delete" wording (delete's gate is conditional, replace's is not); the surviving
  defect is a one-clause omission. Filed to ROADMAP.
- **Rank 8** (write-in-the-editor.md, figure-edit button label wrongly said to key on caption) —
  CONFIRMED — **NOT FOLDED by the first fold round; FOLDED in the re-fold (2026-08-14), verified by grep.** The verifier's own refinement (key the trigger on being in a figure
  at all, not "caption, placement, or both," since a figure with neither still flips the label)
  should govern the fix. Filed to ROADMAP.
- **Rank 9** (manage-the-media-library.md, AVIF omitted from the accepted-types list) — REFUTED.
  The page is accurate: every editor upload runs through `ingestFile`, which rejects AVIF as
  decode-unsupported, so the server-side allow-list including AVIF never reaches an editor. No
  docs action; the genuine code-level inconsistency (allow-list permits what no upload path can
  produce) is filed to ROADMAP as an engine fix (Now tier).
- **Rank 10** (write-in-the-editor.md, "the pencil icon next to it" misdirects to the fold-gutter
  chevron) — CONFIRMED — **NOT FOLDED by the first fold round; FOLDED in the re-fold (2026-08-14), verified by grep.**

#### `docs/extend` (18 findings)

Ranks 1-2 verified in the gate itself; ranks 3-18 verified second-round. 17 folded by
`fold:extend`; rank 1 missed (see headline correction).

- **Rank 1** (build-a-site-by-hand.md, Milestone 3 sends the reader to a 404ing
  `/2026/08/hello`; the real permalink is `/posts/hello`, and the "routing: 'feed'" explanation is
  itself false) — CONFIRMED — **NOT FOLDED by the first fold round; FOLDED in the re-fold (2026-08-14), verified by grep.**
- **Rank 2** (build-a-site-by-hand.md, `ORIGIN` left at `localhost` through two deploys, baking a
  wrong canonical URL/`og:url`/JSON-LD into prerendered pages) — CONFIRMED — FOLDED: `ORIGIN` now
  updated to the deployed origin before the rebuild step.
- **Rank 3** (data-tiers.md, `assets` named where the real adapter member is `media`) — NARROWED —
  FOLDED as narrowed: renamed to `media`; the verifier's own tsc probe showed the proposed
  "declaring `assets` is a type error" claim was wrong (the generic const-inference position
  silently accepts and ignores it), so the fold note says so instead.
- **Rank 4** (debug-your-site.md, same `assets`/`media` mistake in the `media.resolver_absent`
  row) — CONFIRMED — FOLDED.
- **Rank 5** (debug-your-site.md, `rate_limit_failed` Fix column misattributes `limit()` to the
  config rather than the resolved limiter) — CONFIRMED — FOLDED.
- **Rank 6** (announce-on-publish.md, definitional rule omits the draft exclusion) — NARROWED —
  FOLDED as narrowed: the verifier found the page already states the draft exclusion one sentence
  later, so the real defect was the shared causal clause being false for drafts specifically;
  folded that correction rather than the original "the rule already covers it" framing.
- **Rank 7** (what-the-scaffold-wrote.md, undocumented `APP_DB` binding and `migrations-app/`) —
  CONFIRMED — FOLDED.
- **Rank 8** (what-the-scaffold-wrote.md, leftover `probe-craft/` dev fixture route unlisted) —
  CONFIRMED — FOLDED, as a doc-only fix; excluding the fixture from the bake itself is out of
  scope.
- **Rank 9** (configure-rendering.md, "the rest of the leaf types" wrong against the real 10-member
  `ATTRIBUTE_TYPES`) — CONFIRMED — FOLDED with the exact enumeration; the fold agent caught its own
  first-draft error (adding `multiselect`, which is not in `ATTRIBUTE_TYPES` either) before
  finalizing.
- **Rank 10** (build-a-site-by-hand.md, "named at the point it matters" unkept for Workers Paid) —
  CONFIRMED — FOLDED: Milestone 5 now names the dependency, pointing at
  `add-cairn-to-a-sveltekit-app.md`.
- **Rank 11** (wire-the-delivery-surface.md, `_headers` claim and a control experiment flagged as
  unrecorded) — NARROWED — FOLDED as narrowed: the verifier refuted the "cut it" half outright by
  reading the shipped adapter's own source (7.2.9 copies only a root `_headers`, no Response-header
  path into it), so the fix cites the adapter source rather than deleting the true statement.
- **Rank 12** (define-an-adapter-and-schema.md, pointer promises nesting-cap coverage
  `content-model.md` never delivers) — CONFIRMED — FOLDED: the explanation added to
  `content-model.md`.
- **Rank 13** (choose-an-ai-posture.md, `'invite'` wrongly said to emit no `Disallow` lines) —
  CONFIRMED — FOLDED, backed by an executed repro.
- **Rank 14** (docs/extend/README.md, `navLayout` version-history misattribution) — CONFIRMED —
  FOLDED: corrected to name `AdminShellData`'s nav fields and `navFilter`'s types as what broke at
  0.86.0; the same dangling-antecedent "again" fixed in `migration-notes.md`.
- **Rank 15** (rotate-the-github-app-key.md, unsourced 25-key cap and step-6 "at least one key"
  rule) — NARROWED — FOLDED as narrowed: the verifier fetched GitHub's own linked page and found
  both facts stated there; only the 25-key cap is trimmed per the register's link-don't-restate
  rule, and the load-bearing "at least one key" sentence is kept (the finding's claim that the
  rotation order doesn't depend on it was refuted).
- **Rank 16** (data-tiers.md, duplicated manifest-row-contents sentence) — CONFIRMED — FOLDED,
  keeping the one non-duplicate contrast clause.
- **Rank 17** (enable-tidy.md, "every convention below defaults off" contradicted by its own next
  table row) — CONFIRMED — FOLDED.
- **Rank 18** (add-a-second-audience.md, "8-digit" stated as fixed rather than
  8-digit-by-default) — CONFIRMED — FOLDED.

#### `docs/reference` (13 findings)

All 13 folded by `fold:reference`, verified in the tree. None were part of the gate's first-round
batch.

- **Rank 1** (core.md, component-author helpers documented under the wrong subpath) — CONFIRMED —
  FOLDED: the `declare function` block replaced with a pointer to `/render`, which also fixed
  `headRow`'s stale two-parameter signature by removing the duplicate.
- **Rank 2** (sveltekit.md, `deps.branding` is not a real path) — CONFIRMED — FOLDED to
  `deps.auth.branding`.
- **Rank 3** (core.md, `multiselect` missing from the leaf-attribute-types enumeration) —
  CONFIRMED — FOLDED, added to the attribute-throw list.
- **Rank 4** (core.md, `CairnAdapter` undercounted at six members instead of nine) — CONFIRMED —
  FOLDED with the corrected, four-required member table.
- **Rank 5** (auth-crypto.md, `tokensMatch` wrongly described as UTF-16) — CONFIRMED — FOLDED to
  UTF-8 (`TextEncoder`).
- **Rank 6** (admin-routes.md, redirect-table row terser than its siblings, omitting "not the
  site-wide first") — CONFIRMED — FOLDED, the `/admin` index row made role-aware.
- **Rank 7** (cairn-audit.md, "eleven questions" stale against its own "fourteen rules" forty lines
  up) — CONFIRMED — FOLDED to "fourteen questions."
- **Rank 8** (admin-grammar-tokens.md, future-tense `cairn-audit` mention though it has shipped) —
  CONFIRMED — FOLDED to present tense with the real invocation.
- **Rank 9** (admin-routes.md, opening sentence undercounts the `/admin` mount at two files instead
  of the doctor's required four) — NARROWED — FOLDED: the opening sentence fixed; the sub-claim
  about `README.md`'s "two-file catch-all mount" left alone per the verifier (a narrower, still-true
  statement, not a contradiction).
- **Rank 10** (core.md, `AssetConfig` Types row links a nonexistent `assets` adapter member) —
  CONFIRMED — FOLDED, corrected to `media` with the working `#media-adapter-member` anchor.
- **Rank 11** (core.md, `headRow`'s declared block carries the stale two-parameter signature) —
  CONFIRMED — FOLDED (same fix as rank 1, the `/render` pointer).
- **Rank 12** (admin-toolkit.md, opening tier definition names three of four field primitives) —
  CONFIRMED — FOLDED, `FieldRow` added.
- **Rank 13** (vite.md, showcase snippet missing the `fragments` glob and the showcase's other
  build-time plugins) — CONFIRMED — FOLDED, with an honest note about what the snippet omits.

### Stage 2: the blind persona walks

#### `docs/admin` walk (6 findings)

- **Rank 1** (is-it-working.md, no path to make the skipped Cloudflare/D1/GitHub App checks
  actually run) — CONFIRMED, the walker's stopping point — FOLDED: the same fix as claims rank 7
  (the run-it-yourself/can't-run-it-at-all split), the pass's headline fix for the failed walk.
- **Rank 2** (create-your-site.md, no stated GitHub/Cloudflare account prerequisite) — CONFIRMED —
  FOLDED: prerequisites, sign-up links, and "signs in, doesn't create" added.
- **Rank 3** (before-you-start.md, workers.dev-only site cannot send sign-in email, undisclosed
  domain dependency) — CONFIRMED, narrowed on remedy — FOLDED: the free-until boundary now states
  the domain dependency; the verifier found the proposed rewrite of item 2's "nothing new to buy"
  sentence was itself accurate and should not change.
- **Rank 4** (before-you-start.md, claimed no page states which run needs a Cloudflare token) —
  REFUTED: `own-your-domain.md` states it in detail, on page 3 of the same journey the walker read.
  No action; folded together with register rank 14's narrower, still-real residual (the token
  *count*, one plus a conditional second, could be clearer up front).
- **Rank 5** (is-it-working.md, wrangler steps as written need a credential the reader was never
  given) — NARROWED — FOLDED as narrowed: only the authorization question survives (does the
  setup-time Cloudflare sign-in still authorize a bare `wrangler` later — yes); the "where to run
  it" and developer-only classification sub-claims were refuted against the tree.
- **Rank 6** (before-you-start.md, blanket claim that a default site produces every developer-routed
  condition) — NARROWED — FOLDED as narrowed: the blanket claim was false and replaced with the
  verified exceptions only (`config.dependency-floors-unmet` can fire unprompted;
  `config.site-config` skips on every scaffolded site, filed separately to ROADMAP as its own
  engine defect, see the SITE_CONFIG_PATHS entry above).

#### `docs/editors` walk (7 findings)

All 7 folded by `fold:editors`.

- **Rank 1** (welcome.md, no page states the sign-in page's address) — CONFIRMED, the walker's
  stopping point — FOLDED: step 1 now names the site's own address plus `/admin`, with a worked
  example and a bookmark instruction; no configurable-path hedge, since the mount is hardcoded.
- **Rank 2** (write-in-the-editor.md, the create dialog's address field entirely undocumented) —
  CONFIRMED — FOLDED: auto-fill behavior, editability, and the Details-panel path described.
- **Rank 3** (publish-and-history.md, "Select Save"/"Select Publish" used before ever being
  located) — CONFIRMED — FOLDED: a locating paragraph added up top (header band vs. narrow-screen
  bottom bar), plus the overflow menu's three contents named.
- **Rank 4** (manage-your-tag-vocabulary.md, no page says where a tag is applied to an entry) —
  CONFIRMED — FOLDED, pointing to the entry's Details panel.
- **Rank 5** (when-something-goes-wrong.md, "too large, even after shrinking" misattributed to
  pixel dimensions) — NARROWED — FOLDED as narrowed: rewritten to name the site-configurable
  file-size cap (the dominant real cause) rather than a pixel number, since the dimension path is
  reachable only through the near-unreachable HEIC re-encode branch.
- **Rank 6** (manage-the-media-library.md, no page says how to reach the screen) — CONFIRMED —
  FOLDED, naming the sidebar label **Library**.
- **Rank 7** (publish-and-history.md, no way to view a published entry, no address-pattern stated)
  — NARROWED — FOLDED as narrowed: the verifier refuted the proposed "site address + slug"
  fallback (`defaultPermalink` gives that pattern only to Pages); folded instead as a
  developer-set-per-kind pattern with an ask-your-owner fallback.

#### `docs/extend` walk (12 findings)

All 12 folded by `fold:extend`.

- **Rank 1** (add-a-custom-admin-screen.md, `defineAccess` needs a role vocabulary no page produces
  for a site without its own `defineRoles`) — NARROWED, the walker's stopping point — FOLDED: a
  Precondition paragraph added to `restrict-admin-access.md` naming `DEFAULT_ROLES`; the
  verifier's narrowing dropped the finding's false "only add-a-second-audience produces `roles`"
  supporting claim (`restrict-admin-access.md` already links `defineRoles`).
- **Rank 2** (add-a-custom-admin-screen.md, worked `hooks.server.ts` snippets each bare-overwrite
  `handle`, silently discarding `createAuthGuard`) — CONFIRMED — FOLDED: changed to
  `sequence(createAuthGuard(), wireAuditSink)`.
- **Rank 3** (build-a-site-by-hand.md, "named at the point it matters" for Workers Paid unkept) —
  CONFIRMED — FOLDED (same fix as claims rank 10).
- **Rank 4** (build-a-site-by-hand.md, `ORIGIN` never revisited after Milestone 3) — CONFIRMED —
  FOLDED (same fix as claims rank 2).
- **Rank 5** (add-cairn-to-a-sveltekit-app.md, `AUDIT_DB` binding never provisioned) — NARROWED —
  FOLDED as narrowed: the verifier refuted the "must not share the auth database" framing
  (`sveltekit.md:528` explicitly permits it); folded as a dedicated-binding recommendation instead.
- **Rank 6** (add-a-custom-admin-screen.md, `Env` type imported from a file no page says to write)
  — NARROWED — FOLDED as narrowed: the verifier found `Env` already documented at the
  `createSectionAction` anchor the page links; folded a note pointing there plus the `CLUB_DB`
  provisioning gap.
- **Rank 7** (declare-your-own-concept.md, `postsRaw` snippet self-imports and redeclares an export
  `content.ts` already carries) — CONFIRMED — FOLDED, shown as a full amended `content.ts`.
- **Rank 8** (docs/extend/README.md, "neither assumes the other has run" contradicted by
  `define-an-adapter-and-schema.md`'s own stated precondition) — CONFIRMED — FOLDED.
- **Rank 9** (build-a-site-by-hand.md, empty `App.Platform` namespace fails `svelte-check` on a
  custom route reading `platform.env`) — NARROWED — FOLDED as narrowed: the verifier refuted "buried
  in a table cell" (it's a full worked block in `admin-routes.md`) and "every page's criterion is
  `npm run check`"; folded a forward-note linking that worked block.
- **Rank 10** (docs/extend/README.md, evaluation named as a reason to be here with no route to
  `why-cairn.md`) — CONFIRMED — FOLDED, a Why-cairn routing line added.
- **Rank 11** (declare-your-own-concept.md, `cairnManifest`'s `content` map silently omits a
  concept missing from it, unlike the throwing site-indexes path) — CONFIRMED — FOLDED (same fix
  as rank 7, the asymmetry noted).
- **Rank 12** (reuse-content-across-entries.md, every adapter `render` on the track drops
  `resolveFragment`, so `::include` never resolves) — CONFIRMED — FOLDED: `resolveFragment` added
  to all three canonical render snippets across the track.

#### `docs/reference` walk (8 findings)

All 8 folded by `fold:reference`.

- **Rank 1** (core.md/media.md/sveltekit.md, `assets` named where the real adapter member is
  `media`) — CONFIRMED — FOLDED across all three pages (same media/assets sweep as extend claims
  rank 3).
- **Rank 2** (admin-routes.md/sveltekit.md/core.md, `editor.nav` vs. `navMenu` read as a naming
  collision) — NARROWED — FOLDED as narrowed: the verifier found both names correct at their own
  layer (adapter vs. runtime); the real gap, `NavMenuConfig`'s members documented nowhere, closed
  with a new `core.md` section, verified against source (not the finding's own wrong member list).
- **Rank 3** (core.md, `CairnAdapter` undercounted at six members) — CONFIRMED — FOLDED (same fix
  as claims rank 4).
- **Rank 4** (render.md/core.md, `headRow`'s real three-parameter signature vs. core.md's stale
  two-parameter copy) — CONFIRMED — FOLDED (same fix as claims rank 1/11).
- **Rank 5** (log-events.md, `auth.link.requested` cites a nonexistent `/admin/auth/request` URL)
  — CONFIRMED — FOLDED to the real `?/request` action.
- **Rank 6** (sveltekit.md, `MEDIA_BUCKET` wrongly implied to be a fixed binding name) — CONFIRMED
  — FOLDED, clarified as the conventional (not required) name.
- **Rank 7** (components.md, worked snippet imports `siteConfig` without declaring it) — CONFIRMED
  — FOLDED, `siteConfig` added to the import; the proposed retype of `data`'s type declined per the
  verifier (the existing type was already correct).
- **Rank 8** (sveltekit.md, `createCairnAdmin`'s `attention` deps-bag wiring left to inference) —
  NARROWED — FOLDED as a low-priority DX addition, per the verifier (nothing on the page is false;
  the answer is one table away, not a genuine unanswerability).

### Stage 3: the fishtank cross-track read (15 findings)

14 of 15 folded; rank 12 targets a file outside this repo and has no owning fold.

- **Rank 1** (is-it-working.md, wrangler Act step requires an unproduced, uncredentialed tool) —
  CONFIRMED — FOLDED together with admin walk rank 5 (the setup-time sign-in already authorizes
  it).
- **Rank 2** (is-it-working.md, svelte.config.js gap wording reads as contradicting a
  create-cairn-site admin's own tree) — NARROWED — FOLDED together with claims rank 5 (the same
  underlying passage, scoped to hand-built sites only).
- **Rank 3** (own-your-domain.md, closing sentence implies this CLI is still what you run for an
  engine update) — CONFIRMED — FOLDED, corrected to name it as a developer's job.
- **Rank 4** (docs/README.md, "Svelte developer extending a site?" bullet states a false universal
  precondition) — CONFIRMED — FOLDED by `fold:front-doors`, split into the two real doors.
- **Rank 5** (write-in-the-editor.md/add-an-image.md, the alt-text round trip claimed mutual, only
  one direction wrong) — NARROWED — FOLDED as narrowed: only the forward pointer trimmed; the
  correctly-resolving back-pointer left untouched.
- **Rank 6** (publish-and-history.md, Share preview link stated unconditionally though it is an
  opt-in per-site feature) — CONFIRMED — FOLDED with the track's existing conditional idiom.
- **Rank 7** (rotate-the-github-app-key.md, wrong page named as the App's producer, and unlinked
  unlike its siblings) — CONFIRMED — FOLDED, the Precondition repointed.
- **Rank 8** (welcome.md, no address given for the sign-in page — same underlying gap as editors
  walk rank 1) — CONFIRMED — FOLDED together with editors walk rank 1.
- **Rank 9** (is-it-working.md, two links dangling with no anchor on their target) — CONFIRMED —
  FOLDED together with claims rank 5, both pointed at the `#wire-the-dev-backend-and-the-csrf-handoff`
  anchor.
- **Rank 10** (docs/README.md, no link anywhere to the reference index) — NARROWED — FOLDED by
  `fold:front-doors`; the verifier found cairn-pub's hand-authored `/docs` page already carries a
  Reference door, so the gap is confined to the GitHub/npm reader, and a sixth routing line was
  added.
- **Rank 11** (docs/admin/README.md, proposed 1-7 journey reorder to fix prev/next chaining) —
  NARROWED — FOLDED as narrowed: the verifier found the reorder itself doesn't fix the stated
  problem and would put recovery before verification; only the section retitle ("The journey, in
  order" → "The pages, roughly in order") was taken.
- **Rank 12** (`cairn-pub/_redirects`, a redirect losing its anchor fragment on a multi-way split)
  — NARROWED — **no owning fold; not acted on.** The target file lives in the separate `cairn-pub`
  repo, which no Pass D fold dispatch touched. The verifier's own assessment: a defensible
  refinement resting on an unverified assumption about Cloudflare's destination-fragment
  pass-through, and there's a real counterargument the finding doesn't weigh (landing at the arm
  index top vs. mid-scroll). Left for whoever next touches `cairn-pub/_redirects`; not filed to
  ROADMAP since it names a fact this repo can't verify and cairn-pub isn't this repo's roadmap.
- **Rank 13** (doctor.md, stale "Cloudflare readiness page" link label) — CONFIRMED — FOLDED to
  "Is it working?".
- **Rank 14** (before-you-start.md, three-things-stand-between-you enumeration and token-count
  precision) — NARROWED — FOLDED together with admin walk rank 4's residual: item 3 now
  distinguishes the one token from the conditional second wider one.
- **Rank 15** (admin-grammar-tokens.md, sole reference page with an arm prefix in its H1) —
  NARROWED — FOLDED, and corrected in scope: the verifier found `log-events.md` carries the
  identical prefix, so both pages had the prefix dropped, not only the one named.

### Stage 4: the register pass (16 findings)

All 16 folded, spread across four fold agents by page.

- **Rank 1** (is-it-working.md, "adapter" the track's one banned-term leak) — CONFIRMED — FOLDED
  by `fold:admin` (same finding as claims rank 11); the proposed parenthetical rewrite of "content
  concepts" declined (no rule bans "concept").
- **Rank 2** (docs/extend/README.md, Vocabulary section admiring its own precision) — CONFIRMED —
  FOLDED by `fold:extend`, de-self-admired.
- **Rank 3** (core.md and ten reference siblings, contributor-voice ledes addressed to a would-be
  contributor) — NARROWED — FOLDED by `fold:reference` as narrowed: the verifier found the
  reference arm is explicitly chartered as a shared surface, so the proposal to relocate the
  membership rules to `docs/internal/` was declined; only the "Anything proposed here must be..."
  phrasing was reworded to a descriptive boundary statement.
- **Rank 4** (build-a-site-by-hand.md, Workers Paid precondition promise unkept) — CONFIRMED —
  FOLDED by `fold:extend`, together with claims rank 10.
- **Rank 5** (own-your-domain.md, "admission price" metaphor both defines the step and names the
  page's own anatomy) — CONFIRMED — FOLDED by `fold:admin`, both instances removed.
- **Rank 6** (data-tiers.md, duplicated manifest-row sentence) — CONFIRMED — FOLDED by
  `fold:extend`, together with extend claims rank 16.
- **Rank 7** (create-your-site.md, "deploy" never glossed at first use) — CONFIRMED — FOLDED by
  `fold:admin`.
- **Rank 8** (setup-recovery.md/own-your-domain.md, "CLI" the acronym) — NARROWED — FOLDED by
  `fold:admin`: "this CLI" → "this tool," per the register's plain-language convention rather than
  a contract breach.
- **Rank 9** (rotate-the-github-app-key.md, states a link-don't-restate boundary and then crosses
  it seven lines later) — CONFIRMED — FOLDED by `fold:extend`, the dashboard-navigation breadcrumb
  trimmed.
- **Rank 10** (add-cairn-to-a-sveltekit-app.md, GitHub console section names and scroll
  directions) — CONFIRMED — FOLDED by `fold:extend`, trimmed behind the page's existing link to
  GitHub's own guide.
- **Rank 11** (reference/README.md, a sentence restating its own preceding clause) — CONFIRMED —
  FOLDED by `fold:reference`, cut.
- **Rank 12** (setup-recovery.md, "the reconcile commit" an engine-internal name unglossed) —
  CONFIRMED — FOLDED by `fold:admin` to "that commit."
- **Rank 13** (write-in-the-editor.md, "chrome" interface jargon on the plainest track) —
  CONFIRMED — FOLDED by `fold:editors` to "the toolbar and buttons."
- **Rank 14** (auth-channel-security-model.md, editorial rationale for the docs' own organization,
  and a "task guide" anatomy-name citation) — CONFIRMED — FOLDED by `fold:extend`, both removed.
- **Rank 15** (why-cairn.md, ungated `0.94.0` version pin) — NARROWED — FOLDED by
  `fold:front-doors`: the pin is not literally false (0.94.0 is current), so the "not literally
  true" framing was declined; the durability concern was folded, the pin dropped and the durable
  claim about the seam moving across two minors kept.
- **Rank 16** (add-a-second-audience.md, `ManageEditors` component-name link text used for an
  operator-facing screen) — NARROWED — FOLDED by `fold:extend`: only the link text changed to plain
  screen language; the routing target was already correct.

## Cross-reference: the three refutations, gathered

Three findings did not survive independent verification across both rounds: `docs/editors/README.md`
claims rank 4 and `docs/editors/manage-the-media-library.md` claims rank 9 (both reasoned above in
"The refutations, with their reasoning," both from the gate's own first-round verify), plus
`docs/admin/before-you-start.md` walk rank 4 (second round, reasoned in its own verdict above). All
three needed no docs fold. One produced a real, out-of-scope residue that is filed rather than
fixed: the AVIF allow-list/ingest mismatch (`docs/editors` claims rank 9, filed to ROADMAP as an
engine fix). The other two left nothing behind: rank 4 of the README.md finding was simply wrong,
and the fact `before-you-start.md` walk rank 4 claimed no page states is stated in full, three
pages later in the same journey the walker read.

## Summary counts

- **118 findings total.** 105 folded into the docs as CONFIRMED or NARROWED (in some cases folded
  together where two lenses raised the same underlying gap). 3 REFUTED, no fold needed. 9 CONFIRMED
  or NARROWED findings were not folded (the `docs/editors`/`docs/extend` first-round gap) and are
  now owned by a ROADMAP entry. 1 finding (fishtank rank 12) has no owning fold, since its target
  lives outside this repo.
- **3 findings routed to ROADMAP as engine or cross-repo fixes rather than docs fixes:** the DMARC
  string duplicated in `create-cairn-site`'s own CLI copy and README (admin claims rank 4's
  code-side twin), the AVIF server-allow-list/client-ingest mismatch (editors claims rank 9's real
  residue), and the doctor's `SITE_CONFIG_PATHS` gap (admin walk rank 6's revised claim, flagged
  "worth filing separately" by its own verifier).
- **9 findings routed to ROADMAP as still-owed docs fixes**, the `docs/editors`/`docs/extend`
  first-round fold gap above.

