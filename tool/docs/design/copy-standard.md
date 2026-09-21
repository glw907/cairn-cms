# The cairn CLI copy standard, and a first catalogue written to it

Editorial review, 2026-09-20. Read-only on every repo.

> **Plan rulings that override this catalogue (2026-09-20, three-lens review of Pass B2).** This
> document is binding on grammar and register. Where a row below disagrees with the ruled
> vocabulary in `docs/superpowers/plans/2026-09-14-cairn-tool-1-0-pass.md`, the plan wins and the
> row stands only as the editorial reasoning that produced it. Three rows are overridden today.
> The command is `adopt`, never `add` (sections 2.9 and 3.8). The GitHub variable is
> `CAIRN_GH_READ_TOKEN`, never `CAIRN_GH_TOKEN` (sections 3.6 and 3.8). A rate-limited run's
> verdict is UNKNOWN, not the `WARNING, never CRITICAL` the 3.8 rate-limited row asserts, because
> a throttled run did not observe the site. Task 19c-i carries tests that stop an implementer from
> copying a superseded row, and the last two of the three are open questions for the owner under
> "Outside the amendment, for the owner" in that plan.

**Status: binding.** Adopted by the Pass B2 amendment of 2026-09-20 as the standard every
operator-facing string in `tool/` is written to. Section 2 is the standard, section 3 is the
catalogue the messages tables are seeded from, and section 4 is the production mechanism the plan
builds (`make copy-list`, `make check-copy`, the editorial gate before the 1.0 tag). Section 5
lists five rewrites that still need the owner's ear; they are carried in the plan, not resolved
here.

The owner's verdict on the mockup language ("obviously AI dross", naming `Remedies, worst first`)
is correct, and the fault is not in any one string. Every user-facing string in
`mockups/`, `mockups-2/`, `reviews/family.md`, `reviews/usability.md`, and the shipped Go tool was
written by a model with no editorial standard in front of it. Five reviews argued about colour,
ranking, and glyph width; not one of them was given a copy standard, so their own rewrites
introduced new defects (`Remedies, worst first` is `family.md:65`).

This document supplies the standard, catalogues every string against it, and names the production
mechanism that keeps it clean.

The governing fact the mockups missed: **cairn already has a shipped, human-edited exemplar for
exactly this kind of copy.** `src/lib/diagnostics/conditions.ts` holds 26 conditions, each with a
stable dotted id, a noun-phrase `title`, a `why` of one or two sentences, and a `remediation` that
is an imperative naming the real command. The `cairn-doctor` transcript in
`docs/admin/is-it-working.md:32-45` prints `PASS  <Title>: <what was measured, with the value>`.
The CLI does not need a new voice. It needs to stop inventing one.

---

## 1. Diagnosis

### 1.1 The label that names its own sort order

`Remedies, worst first` (`mockups-2/layout.go`, from `reviews/family.md:65`, rewriting
`board-3`'s `do these, worst first`).

Six things are wrong with it, and they are the whole diagnosis in miniature.

**It narrates the sort instead of naming the content.** A reader looking at a ranked list can see
that it is ranked. A label that announces the ordering is the tool talking about itself. No CLI
that is good at this does it: `git status` heads its lists `Changes not staged for commit:`,
`cargo` heads its diagnostics with the error itself, `brew doctor` heads nothing at all.

**The comma-appositive shape is a machine tic.** `Noun, adverbial fragment` with no verb and no
subject is the shape a model reaches for when it wants to sound terse. The same shape recurs three
more times in these sources: `held  https  HSTS off at the edge, until 2026-09-25 (5 days left)`,
`checked 2026-09-20 14:32Z, 4m ago, in 3.2s`, `0.78.0, current`. It reads as compression, so it
feels edited. It is the opposite: it is two facts a writer declined to separate.

**"Remedies" is the wrong register.** It is a clinical and pharmaceutical noun. cairn's own field
is `remediation` and its own prose says "the fix". No operator says "let me look at the remedies".

**It advertises a property the reviews had just proved false.** `usability.md:7` opens with
"'Worst first' is a false claim. BLOCKS task 3." The label was produced as a patch on that
finding, and it inherited the lie's grammar instead of dropping the claim. Copy that brags about a
guarantee is copy that will be wrong the first time the guarantee slips.

**It is not a sentence a person would say aloud.** That is the single most reliable test in this
document. Say "Remedies, worst first" out loud. Nobody has ever said it.

**A careful human editor puts nothing there.** In the single-site body the fix already sits on the
line below its failing row, arrow-prefixed, and needs no heading. In the many-sites body the list
is detached from the rows and does need a name, so the name is the plainest noun phrase for what
the list holds: `what to fix`. The ranking is stated nowhere, because a ranked list reads as
ranked, and because the moment the ranking is stated it becomes a promise.

### 1.2 Invented imperatives and shouted labels

`FIX THIS` (`brief-2`), `NEEDS ATTENTION` (`brief-4`), `EVERY CHECK PASSES` (`brief-1`),
`do these, worst first` (`board-3`), `do this next` (`ledger-2`).

These are dashboard mannerisms wearing the admin's Eyebrow device. `family.md:101` gets the
mechanism right: no monitoring tool shouts a sentence at an operator. Nagios prints
`SERVICE STATUS: information`. `brew doctor` prints `Your system is ready to brew.` and stops. The
shout is a model's idea of urgency; real urgency is the word `CRITICAL` in the first column and
nothing else competing with it.

`FIX THIS` also gives an instruction the reader has not yet been given the means to follow. The
section's job is to name a state (`failing`), and the fix line's job is to give the instruction.
Collapsing them puts the imperative two lines too early.

### 1.3 Internal enums shown to people

`cred-missing` (`ledger-2`, `board-2`, `brief-2`), `reason.cred-missing` and the seven other
`ReasonCode` values (`tool/internal/spine/outcome.go:57-64`), `hsts-off`
(`check_https.go:79`), `always-use-https-off` (`check_https.go:72`), `wrong-nameservers`
(`check_delegation.go:41`), `hostname-not-serving` (`check_serving.go:45,52`), `adopted` as a
column heading (`board-4`), `1 of 2 tiers resolved` (`ledger-2`), `error count is within the
advisory band` (`check_errors.go:73`).

This is the largest single class. An operator cannot act on `hsts-off`, and worse, an operator
cannot tell whether `cred-missing`, `unknown`, and `degraded` on one screen are three problems or
one (`usability.md:13`). "Tier" and "advisory band" are the tool's internal model of itself.

### 1.4 Vague verbs and judgments that withhold the number

`error count exceeds the threshold` (`check_errors.go:71`), `error count is within the advisory
band` (`check_errors.go:73`), `no issues` (`brief-4`), `all clear` (`brief-3`), `2 failing` with no
statement of what failed, `1▲ 7?` (`board-4`).

The check measured a number. Printing its own verdict on the number instead of the number is the
tool asking to be trusted where it could simply show its work. `0 errors in 24h` needs no trust.

### 1.5 Comma-spliced label-plus-qualifier

`HSTS off at the edge, until 2026-09-25 (5 days left)`; `success 4h ago (a91f2c7), main is level`;
`build failed 26m ago (3f0ba18), main is 2 ahead`; `degraded: some checks could not run`;
`checked 2026-09-20 14:32Z · gh:keyring expires 2027-01-01`.

Two unrelated facts joined by a comma or a colon because they happened to be available at the same
moment in the code. The deploy lines are defensible: build result and branch position are one
thought about one deploy. The hold line is not: the failure and the hold are separate facts and
belong in separate fields. `degraded: some checks could not run` is the worst of them, a label
followed by its own definition, which means the label was never needed.

### 1.6 Inconsistent terms for one thing

Counted across the sources: **four words for one state** (`unknown`, `degraded`, `could not run`,
`cred-missing`), **three vocabularies for a check result** (`ok`/`failing`/`unknown` in ledger,
`pass`/`fail`/`skip` in the engine's doctor, `OK`/`WARNING`/`CRITICAL`/`UNKNOWN` on the same line),
**three words for one hold** (`ack`, `acknowledged`, `ACKNOWLEDGED`), **two meanings for `?`**
(could-not-run, and log level warn), **two meanings for `engine`** (the installed version, and a
check id), and **two names for one variable** (`CAIRN_CF_TOKEN` in every mockup,
`CAIRN_CF_READ_TOKEN` in `tool/internal/providers/missing.go:11`). That last pair is a real bug
hiding inside a copy defect: the mockups tell the operator to set a variable the tool does not
read.

### 1.7 Padding, and bookkeeping shown to the operator

`no remedy page yet` (`brief-2`, `board-3`, `ledger-2`), `6 sites in the registry` (`brief-4`),
`some checks could not run` after a label that said so, `checked` repeated in a column heading and
in every cell of that column (`board-4`).

`family.md:70` voted to keep `no remedy page yet` as "honest absence, in register". It is neither.
It is the tool's own to-do list, printed where the operator's to-do list goes. Absence needs no
announcement: a fix line with no URL is a fix line with no URL.

### 1.8 Anthropomorphized machinery

`--since wants a positive integer followed by "m", "h", or "d"` (`internal/logs/logs.go:86`).

This is the best error message in the Go tree and it is still off. Flags do not want things. The
sentence also never says what the operator typed, so a script author reading a log cannot see the
rejected value. The fix keeps everything that is good about it (the grammar, the three examples)
and adds the input.

### 1.9 The green last line

`brief-3` ends a four-sites-critical, 46-line scroll on `● all clear  ecxc.ski · cairn.pub`.
`usability.md:69` calls it "the single most dangerous frame in the set" and is right. This is a
copy defect, not a layout defect: the string `all clear` is a claim about the whole run, placed
where it describes two of six sites. Ruling 4 in `iteration-2-brief.md` fixes the position;
deleting the phrase fixes the claim.

---

## 2. The CLI copy standard

### 2.1 Governing standards, and which governs where

Terminal output an operator reads is UI text. It follows the **Microsoft Writing Style Guide**
(https://learn.microsoft.com/style-guide/welcome/), the workstation's standard for UI and
end-user copy, and specifically its error-message guidance: describe the problem, then the
solution; second person; no apology.

The external exemplars this standard imitates, with quotes and URLs, are in the appendix.

Two family documents narrow it, and they win on conflict:

- `docs/internal/admin-design-system.md`, Voice: professional and restrained, never cute or
  chatty. This overrides Microsoft's warmth. Microsoft would write "Don't worry about losing your
  work"; cairn does not reassure an operator, it tells them the state.
- `src/lib/diagnostics/conditions.ts` and the `cairn-doctor` transcript at
  `docs/admin/is-it-working.md:32-45`: the shipped in-family exemplar for a check line, a cause,
  and a fix. Imitate these before reaching for any rule below.

Go **error values** are a different audience and keep their own standard: `go-conventions`, lowercase,
package-prefixed, wrapped with `%w`. `store: open %s: %w` is correct Go and must not change. What
must change is that `cmd/cairn/main.go:14` prints those values straight to the operator. See 4.2.

### 2.2 Person, tense, mood, case

A detail line states what the tool measured in the third person, with no `I` and no `you`. A fix
line commands in the second person: "Turn on Always Use HTTPS." State is present tense (`HSTS is
off for the zone`); a completed event is past (`build failed 26m ago`). Voice is active, so
Cloudflare rejected the token rather than the token being rejected.

Case is sentence case everywhere, with two exceptions: the four verdict words, which are capitals
by monitoring convention, and identifiers, which keep whatever spelling they have. Domains are
never case-folded. Title case never appears, which rules out both `NEEDS ATTENTION` and
`Remedies, Worst First`.

### 2.3 Labels: when a noun, when nothing

A section label is a **bare lowercase noun or noun phrase naming the state of the rows beneath
it**: `failing`, `could not run`, `held`, `passing`, `what to fix`, `logs`. It carries no verb, no
imperative, no count, and no statement about ordering.

**Prefer no label.** A label earns its place only when the rows beneath it are not
self-describing, which happens exactly twice: when rows of different states are grouped
(single-site body), and when a list is detached from the rows it refers to (the many-sites fix
list). Everywhere else, delete it. The single-site fix line under its own failing row needs no
heading. A nine-row table of `pass` needs no heading but keeps `passing` because the header's tally
names the same word.

### 2.4 The grammar of a detail line

**What was measured, in the operator's terms, with the number.**

A fragment, not a sentence: the row already reads `fail  deploy  <detail>`, so the detail supplies
the predicate. Lowercase initial unless it starts with an identifier or a proper noun. No final
period. One clause, or two when they are one thought about one thing. Under 60 characters where the
facts allow.

It names the thing the operator can see or change (a setting, a record, a version, a status code),
never the tool's internal state. It carries the measurement: the count, the version pair, the
latency, the timestamp. If the check counted something, the number is in the line.

```
pass   200 in 84ms
pass   0 errors in 24h
fail   Always Use HTTPS is off for the zone
fail   0.71.0 installed, 0.78.0 latest, 7 releases behind
fail   7 errors in 24h, all publish.commit-failed
```

**The stable machine token is never the detail.** It is the `Condition` id (dotted,
`edge.https-not-forced`), which the engine already publishes and already freezes, printed muted at
the end of the row. See 2.11.

### 2.5 The grammar of a fix line

**One imperative clause naming the action and where to take it, optionally followed by one `then`
tail naming the confirming step. Capital initial. Final period.** This is
`conditions.ts`'s `remediation` grammar, unchanged.

It names the real command, the real setting under its real menu path, or a full URL. It never says
"fix the build" or "check the configuration", which return the problem to the operator unsolved.
Where the action cannot be automated and belongs to a person, the line says so plainly and names
whose it is.

```
Turn on Always Use HTTPS for the zone under SSL/TLS, Edge Certificates.
Run `wrangler email sending enable <domain>`, then deploy again.
Read the build log in the Cloudflare dashboard, then push a fix.
Ask whoever owns the GitHub organization to install the App on this repository.
```

No three-clause comma chains. `read the build log, fix the build, push again` reads as one
instruction and is three, one of which ("fix the build") is not an instruction at all. Multi-step
work goes to the doc URL, which is the second line, wrapped, never truncated.

### 2.6 The grammar of a skip reason

**The missing input, named, and where it comes from.** A skip is not a failure and never reads as
one. It is a fragment in the same style as a detail line, and the operator's question is only ever
"is this my problem?", so the line answers it.

```
skip   no Cloudflare token
skip   no zone id recorded for this site
skip   the site did not answer
skip   the Worker has no observability dataset
```

Where one missing input caused several skips, the group carries **one** fix line, not one per row.

### 2.7 The grammar of an error message

Four parts, each one line, in this order. Parts three and four merge when the cause is the fix.

1. **What happened**, prefixed `cairn: `, sentence case, final period.
2. **Why**, or the underlying message, when it adds something the first line does not.
3. **What to do next**, an imperative naming a command or a URL.

No stack, no Go error chain, no `Error: ` doubled by the framework, no exit-code number in prose.
The message goes to stderr; the exit code carries the machine signal.

```
cairn: no credentials found.
The health checks read your Cloudflare and GitHub tokens from the OS keyring or the environment.
Run `cairn auth set CAIRN_CF_READ_TOKEN` to store one.
```

### 2.8 Numbers, dates, durations, units

- An instant is ISO 8601 with a real zone: `2026-09-20 14:32 UTC`. Never `Sep 25`.
- Recency is relative, with the absolute in parentheses once per block:
  `checked 4m ago (2026-09-20 14:32 UTC)`.
- A duration in prose spells the unit: `5 days left`, `18 hours left`, `expires in 6 days`. A
  column-tight field may abbreviate (`4m ago`, `31h ago`, `2.9s`), and a single output never mixes
  the two forms for the same fact.
- A count is digits and always carries its noun: `7 errors in 24h`, `2 commits ahead`, `9 passing`.
  `2▲ 2?` is not a count, it is a cipher.
- Latency is milliseconds under one second, seconds with one decimal above: `84ms`, `2.9s`.
- A version is bare, with no `v`: `0.78.0`.
- One clock per output. A header saying `checked 4m ago` over rows saying `9d ago` must be measuring
  different things, and must say which.

### 2.9 The fixed vocabulary

One word per concept. The banned column is exhaustive for these sources.

| concept | the word | never |
|---|---|---|
| run verdict | `OK` `WARNING` `CRITICAL` `UNKNOWN` (capitals) | healthy, degraded, critical (lowercase), all clear, no issues, fine |
| check result | `pass` `fail` `skip` `held` | ok, failing, unknown, ack, acknowledged, passed, error, warn |
| section for skipped checks | `could not run` | unknown, degraded, unavailable, not observable, indeterminate |
| why a check skipped | the missing input, named | `cred-missing`, `reason.*`, park codes, enums |
| a failure the operator has accepted for now | `held`, a `hold` | ack, acknowledged, snoozed, muted, suppressed, waived |
| the action that clears a failure | `fix` (verb and noun) | remedy, remediation, worklist, action item, next step, resolution |
| the thing checked | `site` | target, host, endpoint, registry entry, property |
| the set of them | `sites` | fleet, registry, estate, inventory, portfolio |
| the installed cairn version | `engine version` | package, library, @glw907/cairn-cms (in operator prose) |
| the check that compares versions | check id `engine` | engine-version (per brief ruling 13); and `engine` alone never means the version |
| the OS credential store | `keyring` | vault, secret store, credential manager, secure storage |
| one credential | `token` | credential (fine as a category), secret, key, tier |
| when the data was gathered | `checked <n> ago` | last seen, data age, stale, refreshed |
| the stable id of a failure mode | `condition id` | error code, enum, reason, slug |
| adding a site to the tool | `add` | adopt, adopted, onboard, register, enroll |

Reconciliation with `iteration-2-brief.md`: rulings 1, 2, 5, and 9 are adopted unchanged. Ruling 3's
`Print the condition id, muted` is adopted, with 2.11 stating what that promises. Ruling 13's
"check id `engine` stays" is adopted, and the ambiguity `family.md:92` found is closed by banning
`engine` as a synonym for the version. `family.md:70`'s keep of `no remedy page yet` is overruled.
`family.md:65`'s `Remedies, worst first` is overruled.

### 2.10 What never appears

Exclamation marks. `please`. `simply`, `just`, `easily`, `quickly`, `merely`. Apology: `sorry`,
`unfortunately`, `we're afraid`. Humor, wordplay, and the cairn stacking metaphor (it belongs in
the admin, where there is room for it; a terminal has none). Emoji. Em dashes. `Note that`,
`Please note`. Title case. ALL CAPS other than the four verdicts and identifiers. A bare internal
id with no human line beside it. A claim about ordering, completeness, or severity that the code
does not guarantee. A green line below the last failure. The word `error` as a status word, since
it collides with the `errors` check id and the log level.

### 2.11 One fact, three surfaces

The same fact appears in three renders, and prose belongs in only two of them.

**Terminal body.** Columns and colour carry structure; the detail line is a fragment; the condition
id trails the row, muted, as the greppable handle. Verdict first and last.

**Plain-text body** (pipe, cron mail, CI log). One fact per line, `name: state - detail`, the fix
on its own following line, keyed `remedy:` in the plugin-output idiom. Nothing aligned, nothing
padded, no glyph carrying meaning, readable in a proportional font. Verdict first and last, then
`exit <n>`. Prose is identical to the terminal's; only the frame differs. `remedy page:` becomes
`docs:`.

**`--json`.** No prose is a contract. It carries `state`, `condition`, `reason`, `fields`,
`held_until`, `verdict`, `exit`, timestamps, and numbers. `detail` is included for display and is
documented as unstable, so nothing may parse it. The fix text and the doc URL are omitted
entirely: a consumer resolves `condition` against the published condition registry, which is
where a stable remedy already lives. This is the ShellCheck contract (a stable code plus a human
sentence) and it is the reason 2.4 forbids tokens in the detail field: a token in a prose field is
a contract nobody promised.

---

## 3. The catalogue

Every user-facing string found in the sources. `delete` means the best rewrite is no string.

### 3.1 Header and frame

| source | string | problem | rewrite |
|---|---|---|---|
| `mockups-2` s1 | `OK  ecxc.ski  9 passing` | none | keep |
| `mockups-2` s2 | `CRITICAL  907.life  2 failing · 2 could not run · 1 held · 4 passing` | none | keep |
| `mockups-2` | `checked 4m ago (2026-09-20 14:32 UTC) in 2.9s` | missing comma before `in` makes three facts read as two | `checked 4m ago (2026-09-20 14:32 UTC), in 2.9s` |
| `brief-1`, `board-3`, `ledger-4` | `checked 2026-09-20 14:32Z · cf:keyring · gh:keyring expires 2027-01-01` | `cf:`/`gh:` are abbreviations nobody expanded; credential state is not header material (brief ruling 8) | delete; the expiry belongs on the `creds` row |
| `brief-4` | `6 sites in the registry` | `registry` is cairn's npm word; padding | `6 sites` |
| `mockups-2` s3 | `CRITICAL  6 sites  3 CRITICAL · 1 WARNING · 2 OK` | the lead word and the tally use one word for two scopes | keep; see limits (5) |
| `mockups-2` s5 | `── logs  ecxc.ski  2026-09-20 UTC ──` | none | keep |
| `mockups-2` s5 | `7 records · 14:14 to 14:28 UTC` | none | keep |
| `mockups-2` plain | `exit 2` | none | keep |
| `mockups-2` plain | `remedy page: <url>` | nobody says "remedy page" | `docs: <url>` |
| `mockups-2` plain | `remedy: <text>` | none; matches plugin-output idiom | keep |

### 3.2 Section labels

| source | string | problem | rewrite |
|---|---|---|---|
| `mockups-2` | `── failing ──` | none | keep |
| `mockups-2` | `── could not run ──` | none | keep |
| `mockups-2` | `── held ──` | none | keep |
| `mockups-2` | `── passing ──` | none | keep |
| `mockups-2` s3, s4 | `── remedies, worst first ──` | narrates its own sort; wrong register; claims a guarantee | `── what to fix ──` in the many-sites body; **delete** in the single-site body |
| `brief-2` | `FIX THIS` | shouted invented imperative | `failing` |
| `brief-2` | `COULD NOT RUN` | shouted | `could not run` |
| `brief-2` | `ACKNOWLEDGED` | shouted; wrong word | `held` |
| `brief-1` | `EVERY CHECK PASSES` | shouted; a claim where a count belongs | `passing` |
| `brief-4` | `NEEDS ATTENTION` | dashboard mannerism | `failing` |
| `brief-4` | `HEALTHY` | fifth state word | `passing` |
| `board-3` | `do these, worst first` | the origin of the defect | `what to fix` |
| `ledger-2` | `── do this next ──` | invented imperative; duplicates the fix line above it | delete |
| `ledger-2` | `── checks ──` | labels the only thing on screen | delete |

### 3.3 The degraded notice and the skip group

| source | string | problem | rewrite |
|---|---|---|---|
| `brief-2`, `board-3`, `ledger-2` | `? degraded: some checks could not run` | fifth state word; label followed by its own definition | delete |
| same | `CAIRN_CF_TOKEN is unset, so email and errors could not run` | good sentence, wrong variable name, no action | delete; the rows name the checks |
| `mockups-2` s2 | `→ export CAIRN_CF_TOKEN=<a Cloudflare API token>, then re-run` | wrong variable (`CAIRN_CF_READ_TOKEN`); `export` is shell-specific and Windows is a target; teaches an env var over the keyring | `Run \`cairn auth set CAIRN_CF_READ_TOKEN\`, then run the command again.` |

### 3.4 The nine checks

Detail lines for the realistic cases. `creds`, `serving`, `delegation`, `https`, `email`, `deploy`,
`publish-path`, `engine`, `errors`.

| check | state | source string | problem | rewrite |
|---|---|---|---|---|
| creds | pass | `both tiers resolved` | `tier` is internal | `Cloudflare and GitHub tokens read from the keyring` |
| creds | pass | `GitHub tier resolved, Cloudflare tier missing` | green on a partial credential that caused two skips (`usability.md:46`); `tier` | state becomes `fail`: `Cloudflare token not found; GitHub token read from the keyring` |
| creds | pass | `1 of 2 tiers resolved` | same, plus arithmetic instead of names | as above |
| creds | pass | `github reports no expiry for this token` | none, capitalize | `GitHub reports no expiry for this token` |
| creds | fail | `reason.cred-expiring: expires 2026-09-26T00:00:00Z` (`check_creds.go:85`) | leaked enum; RFC3339 where a date and a countdown are wanted | `the GitHub token expires 2026-09-26, in 6 days` |
| creds | fail | `the GitHub token expires in 6 days` | no date, so a log read weeks later is meaningless | `the GitHub token expires 2026-09-26, in 6 days` |
| creds | fail | `unauthorized` / `forbidden` (`outcome.go:96`) | bare provider enum | `Cloudflare rejected the token` / `the token lacks the Zone:Read permission` |
| creds | skip | n/a | none exists | `cannot read the keyring` |
| serving | pass | `200 in 84ms` | none | keep |
| serving | fail | `hostname-not-serving` (`check_serving.go:45,52`) | kebab token in a prose field | `the hostname does not answer` |
| serving | fail | `connection refused at the origin` | none | keep |
| serving | fail | n/a | n/a | `502 from the origin` |
| serving | skip | n/a | none exists | `no hostname recorded for this site` |
| delegation | pass | `nameservers match the zone` | none | keep |
| delegation | fail | `wrong-nameservers` (`check_delegation.go:41`) | kebab token | `the domain points at nameservers outside this Cloudflare zone` |
| delegation | skip | `no assigned nameservers recorded for this site` | none | keep |
| delegation | skip | `cloudflare reports no zone for this domain` | capitalize | `Cloudflare reports no zone for this domain` |
| delegation | skip | `no Cloudflare token` | none | keep |
| https | pass | `forced, HSTS 1 year` | `forced` with no object | `forced at the edge, HSTS 1 year` |
| https | fail | `always-use-https-off` (`check_https.go:72`) | kebab token | `Always Use HTTPS is off for the zone` |
| https | fail | `hsts-off` (`check_https.go:79`) | kebab token | `HSTS is off for the zone` |
| https | fail | `always-use-https-off; hsts-off` (`check_https.go:74`) | two tokens joined by a semicolon | `Always Use HTTPS and HSTS are both off for the zone` |
| https | fail | `HSTS off at the edge` | none | keep |
| https | skip | `no zone id recorded for this site` | none | keep |
| https | skip | `zone settings carried no always_use_https entry` | the tool's read, not the operator's world | `Cloudflare returned no Always Use HTTPS setting for the zone` |
| email | pass | `sender onboarded 41d ago` | abbreviated unit in a prose field | `sending domain onboarded 41 days ago` |
| email | fail | `sending subdomain not onboarded` | no article | `the sending subdomain is not onboarded` |
| email | fail | `dmarc policy is p=none` | lowercase acronym; does not say what it costs | `the DMARC record allows every sender (p=none)` |
| email | fail | `dmarc record carries no p= policy` | lowercase acronym | `the DMARC record carries no p= policy` |
| email | fail | `no _dmarc TXT record published` | none | `no DMARC record published for the domain` |
| email | fail | `sending subdomain SPF record missing <include>` | noun stack, no verb | `the sending subdomain's SPF record omits <include>` |
| email | fail | `no dkim selector txt resolved` | lowercase acronyms; `resolved` is the tool's verb | `no DKIM record found for the sending subdomain` |
| email | skip | `no Cloudflare token` | none | keep |
| deploy | pass | `success 4h ago (a91f2c7), main is level` | `success` is a bare noun | `built 4h ago (a91f2c7), main is level` |
| deploy | fail | `build failed 26m ago (3f0ba18), main is 2 ahead` | `2 ahead` drops its noun | `build failed 26m ago (3f0ba18), main is 2 commits ahead` |
| deploy | skip | `site did not answer` | no article | `the site did not answer` |
| deploy | skip | `builds-not-connected` (`errors.go:42`) | kebab token | `Workers Builds is not connected to this Worker` |
| publish-path | pass | `App installed, branch writable` | none | keep |
| publish-path | fail | `the App is not installed on this repository` | none | keep |
| publish-path | skip | `no cairn branches or publish commits observed` | none | keep |
| engine | pass | `0.78.0, current` | comma appositive; two facts, one is inferable | `0.78.0 is current` |
| engine | fail | `0.71.0 installed, 0.78.0 latest` | withholds the distance, which is the whole point | `0.71.0 installed, 0.78.0 latest, 7 releases behind` |
| engine | skip | `site package.json carries no @glw907/cairn-cms dependency` | missing article | `the site's package.json carries no @glw907/cairn-cms dependency` |
| engine | skip | `site or latest version not found in the published version list` | `site ... version` noun stack | `the installed or latest version is not in the published version list` |
| errors | pass | `0 in 24h` | count with no noun | `0 errors in 24h` |
| errors | pass | `error count is within the advisory band` (`check_errors.go:73`) | judgment instead of the number; `advisory band` is internal | `0 errors in 24h` |
| errors | fail | `error count exceeds the threshold` (`check_errors.go:71`) | same, and the threshold is unnamed | `31 errors in 24h, above the 10 the check allows` |
| errors | fail | `7 in 24h, all publish.commit-failed` | count with no noun | `7 errors in 24h, all publish.commit-failed` |
| errors | skip | `worker has no observability dataset` | lowercase product noun | `the Worker has no observability dataset` |
| errors | skip | `no Cloudflare token` | none | keep |
| any | fail | `<id> panicked with a %T` (`health.go:150`) | reaches an operator as a Go type name | `the <id> check crashed; this is a bug in cairn. Report it at https://github.com/glw907/cairn-cms/issues` and keep the type in `--json` |

### 3.5 Fix lines

| source | string | problem | rewrite |
|---|---|---|---|
| `mockups` all | `read the build log, fix the build, push again` | three comma-spliced clauses; "fix the build" is not an instruction; no location | `Read the build log in the Cloudflare dashboard, then push a fix.` |
| `mockups` all | `bump the dependency range and redeploy` | "bump" is developer slang; no file named | `Raise the @glw907/cairn-cms range in package.json, then deploy again.` |
| `mockups` all | `run wrangler email sending enable for the apex` | command not written as a command; "apex" unglossed | `Run \`wrangler email sending enable <domain>\` for the apex domain, then deploy again.` |
| `mockups` all | `read the error events, then fix the failing path` | second clause returns the problem unsolved | `Read the publish.commit-failed records in Workers Logs.` |
| `mockups` all | `check the Worker route and the zone DNS record` | `check` is the vaguest verb available, and collides with the noun `check` | `Confirm the Worker route and the zone's DNS record point at this site.` |
| `mockups` all | `turn on Force HTTPS for the zone, then re-run` | wrong setting name (Cloudflare's is Always Use HTTPS); `re-run` | `Turn on Always Use HTTPS for the zone under SSL/TLS, Edge Certificates.` |
| `mockups` s7 | `mint a new token and store it in the keyring` | "mint" is internal | `Create a new token, then run \`cairn auth set CAIRN_GH_TOKEN\`.` |
| `mockups` s7 | `install the GitHub App on the repository, then re-run` | `re-run` | `Install the GitHub App on the repository.` |
| all | `no remedy page yet` | the tool's bookkeeping in the operator's column | delete |
| all | `is-it-working#upgrade-the-engine` | a fragment that resolves to nothing an operator can open | the full URL, per brief ruling 3 |
| all | `, then re-run` | `re-run` is not a word an operator uses, and it is usually implied | delete, or `, then run the command again.` where re-running is the confirming step |

### 3.6 The held line

| source | string | problem | rewrite |
|---|---|---|---|
| `mockups-2` s2 | `○ held  https  HSTS off at the edge, until 2026-09-25 (5 days left)` | comma splices two facts into the detail column | detail stays `HSTS off at the edge`; a trailing field reads `held until 2026-09-25, 5 days left` |
| `brief-2` | `HSTS off at the edge · acknowledged until Sep 25` | wrong word; a date with no year or zone | as above |
| `ledger-2` | `◌ https  ack  HSTS off at the edge · until 2026-09-25` | `ack` | as above |
| expiring | n/a | n/a | `held until 2026-09-22, 18 hours left` |
| expired | `hold expired 2026-08-11` | none; and correctly renders as `fail` | keep |
| missing | n/a | nobody is named (`usability.md:31`) | if the hold record carries an author, `held by kari@ecxc.ski until 2026-09-25, 5 days left`; see limits (4) |

### 3.7 The many-sites body and the legend

| source | string | problem | rewrite |
|---|---|---|---|
| `mockups-2` s3b | column headings `site verdict failing could not run held engine checked` | none | keep |
| `mockups-2` s3a | column headings `creds serving dns https email deploy publish engine errors` | `dns` and `publish` disagree with the check ids `delegation` and `publish-path` | use the check ids, abbreviating only by truncation the reader can undo |
| `board-4` | `adopted` column | undefined jargon (`usability.md:102`) | `added` |
| `board-4`, `ledger-4` | `issues` column with `2▲ 2?` | a cipher; `issues` is a fifth word | the s3b columns, counted in digits under worded headings |
| `board-4` | `none` in the issues column | a word where a blank reads better | blank |
| `brief-4` | `no issues` | claim in place of a count | `9 passing` |
| `brief-3` | `all clear  ecxc.ski · cairn.pub` | a whole-run claim describing two of six sites | `2 passing  ecxc.ski · cairn.pub` |
| `brief-2` | `● 4 healthy  creds · serving · ...` | fifth state word | `● 4 passing  creds · serving · ...` |
| `board-3` | legend `● ok  ▲ failing  ? could not run  ◌ acknowledged` | three of four words are outside the vocabulary; a legend is a confession that the rows are unreadable | delete; every row carries its state word or its verdict word |
| `board-3` | legend `cr creds · sv serving · dl delegation · ...` | the cipher the charter rules out (`family.md:79`) | delete with the cipher |
| `board-3` | `6 sites   4▲ critical   2● ok` | glyph-in-count; lowercase verdict words | `6 sites  4 CRITICAL · 2 OK` |
| `brief-3` | `907.LIFE`, `AKSAILINGCLUB.ORG` | a domain is an identifier and is never case-folded | lowercase as given |

### 3.8 Error messages

| case | current | rewrite |
|---|---|---|
| no credentials | none; checks silently skip | `cairn: no credentials found.` / `The health checks read your Cloudflare and GitHub tokens from the OS keyring or the environment.` / `Run \`cairn auth set CAIRN_CF_READ_TOKEN\` to store one.` |
| keyring unavailable | the raw OS error, via `main.go:14` | `cairn: the OS keyring did not open.` / `<the OS message, one line>` / `Set CAIRN_CF_READ_TOKEN in the environment instead, or see https://cairn.pub/docs/admin/is-it-working#store-credentials.` |
| unknown site | none | `cairn: no site named "example.org".` / `Run \`cairn sites list\` to see the sites cairn knows, or \`cairn add example.org\` to add this one.` |
| network down | `reason.offline`, and a bare Go error | `cairn: could not reach the network.` / `No check ran, so this run says nothing about the site.` / `Check your connection, then run the command again.` Verdict `UNKNOWN`. |
| rate limited | `rate-limited` (`errors.go:50`) | `cairn: Cloudflare rate-limited this run.` / `The checks that need Cloudflare could not run; the others are reported above.` / `Run the command again in <Retry-After>.` Omit the third line when the response carries no `Retry-After`. Verdict `WARNING`, never `CRITICAL`. |
| invalid `--since` | `--since wants a positive integer followed by "m", "h", or "d" (for example "90m", "24h", or "7d")` (`logs.go:86`) | `cairn: --since "7" is not a duration.` / `Use a whole number of minutes, hours, or days: 90m, 24h, 7d.` |
| usage error | cobra's default, plus `auth set: %q is not one of %s` | `cairn: "FOO" is not a credential cairn stores.` / `The names are CAIRN_CF_READ_TOKEN, CAIRN_GH_TOKEN.` And for arity: `cairn: cairn health takes at most one site.` / `Run \`cairn health --help\` for usage.` |
| a crashed check | `<id> panicked with a <type>` | `cairn: the <id> check crashed.` / `This is a bug in cairn. Report it at https://github.com/glw907/cairn-cms/issues.` Go type stays in `--json` and the log. |

### 3.9 Log view

| source | string | problem | rewrite |
|---|---|---|---|
| `mockups-2` s5 | `reason=stale-edit` | a kebab token, but here it is a log field value the engine emits, not CLI copy | keep verbatim; the CLI never rewrites a record |
| `mockups-2` s5 | `reason=the branch is behind main by 2 commits` | none | keep; never truncate (`usability.md:60`) |
| `ledger-5` | `reason=branch is behind m…`, `reaso…` | truncation of the one field that matters | wrap |
| `brief-5`, `board-5` | `?` as the warn glyph | `?` already means skip | no glyph on a log line (brief ruling 1) |

---

## 4. How production keeps it clean

### 4.1 One reviewable place

Every operator-facing string lives in a `messages.go` per package, as named constants or a keyed
table, with no operator prose in a check body, a command body, or a format string at the call
site. `internal/health/messages.go` holds the nine checks' detail and skip fragments;
`internal/health/fixes.go` holds the fix lines keyed by `spine.Condition`;
`cmd/cairn/messages.go` holds the error messages and command help. A check returns a
`spine.Condition` and its measured values; the message table renders the line.

This is not stylistic. It is what makes 4.3 and 4.4 possible at all: a linter cannot find prose
scattered across 40 files, and a human cannot read it.

Two invariants a test can hold: every `spine.Condition` has exactly one fix line, and every fix
line's condition exists (the shape `check:reference` and `check:readiness` already enforce on the
TypeScript side).

### 4.2 The error boundary

`cmd/cairn/main.go:14` currently does `fmt.Fprintln(os.Stderr, err)`, which prints Go error
chains (`store: open /home/geoff/.local/state/cairn: permission denied`) to an operator. Replace it
with one translation function that maps a sentinel or wrapped error onto a message from the table,
falling back to `cairn: <err>` only for an error the table does not know. Go error values keep the
`go-conventions` grammar; the boundary renders them.

### 4.3 The golden that a human reads

`make copy-list` prints every string in every table, grouped by package and sorted, with no run
required. Its output is committed as `testdata/copy.golden` and a test asserts they match, so a new
string cannot land invisibly: it shows up as a one-line diff in review, which is exactly where an
editorial eye belongs. This is the `--list` flag of
`cairn-cms/scripts/checks/check-admin-prose.mjs`, ported, and that script's rationale (component
copy ships compiled, so no consumer hook sees it) applies verbatim to a compiled Go binary.

### 4.4 Deterministic checks

Three, all over the golden, none over the Go source:

- **`tellgrader --register editor testdata/copy.golden`.** It is the workstation's register-aware
  tell scanner and `editor` is the register this standard sits under. Pointing it at the golden
  rather than at `.go` files is what makes it work: it never sees Go syntax, only prose.
- **Vale with the Microsoft package**, via a `.vale.ini` glob onto `tool/**/testdata/copy.golden`
  with `StylesPath` reaching the vendored package the engine already carries. Microsoft is the
  correct package here, matching the register.
- **A local vocabulary check**, the Go analogue of `check-admin-prose.mjs`: the banned column of
  2.9 and the list in 2.10 as literal deny-lists, plus three structural rules a word list cannot
  express: a detail string matching `^[a-z0-9]+(-[a-z0-9]+)+$` (a kebab token in a prose field), a
  fix line with more than one comma before its first period, and any `!`. Run it as
  `make check-copy` in the gate, with `CAIRN_GATE_LANE=light` since it launches no browser.

### 4.5 The editorial gate before 1.0

One named read, once, before the 1.0 tag: the `cairn-register-editor` agent over
`testdata/copy.golden` with this document as its contract, then the owner's own read of the same
file. The agent is the right one because it returns ranked findings with proposed rewrites rather
than a verdict, and the golden is small enough for one dispatch. `prose-voice-reviewer` is the
alternative if the register itself is in question rather than the strings.

After 1.0, the golden diff in review is the standing gate and no separate ritual is needed.

### 4.6 The rule for implementers

**An implementer never writes operator-facing copy.** A task that needs a new string adds the key
to the table with the plainest fragment that satisfies 2.4 through 2.7, and says so in its report
under a heading the conductor reads. The conductor batches new strings into one editorial dispatch
per pass, the way `cairn-cms`'s CLAUDE.md already batches engine docs fixes out of a site pass.

Per the workstation's "a rule lives where it executes" rule, this paragraph is not enough on its
own. It has to land in three places in the same pass that adopts it: the `check-copy` gate's
failure message (which names this document), the B2 plan's per-task acceptance criteria, and the
`cairn-implementer` agent definition. A copy standard that lives only in a review file reaches
nobody.

### 4.7 Strings owed to the editorial gate (Task 20b-ii, 2026-09-21; three added at the segment 3 review the same day)

The render's fleet body, its log body, and its status line each needed a fragment this catalogue
does not carry. Each is the plainest form satisfying 2.4 through 2.8, written to the fixed
vocabulary of 2.9, and each is **owed to the Task 22a editorial gate** rather than adopted here.

| where | string | why it was needed |
|---|---|---|
| status line, a token the run could not find | `CAIRN_GH_READ_TOKEN is not set, so deploy, engine and publish-path could not run` | 3.3 deletes the old degraded notice and says "the rows name the checks", which a site listing has no rows to do |
| status line, a token the run found | `CAIRN_CF_READ_TOKEN read from the keyring` | brief ruling 8 moved the keyring detail off the header and onto the `creds` row, and 3.1 deletes the `cf:`/`gh:` form without writing its replacement |
| status line, a token's expiry | `CAIRN_CF_READ_TOKEN read from the keyring, expires 2026-09-26, in 6 days` | the date and countdown are 3.4's own approved `creds` row form, here as a clause on the token's line |
| status line, a degraded run naming no token | `some checks could not run for want of a token` | 3.3 deletes `degraded: some checks could not run`; this keeps the section's own words and drops the label |
| fix table, a check blocked by a missing token | `Run \`cairn auth set\` naming the missing token, then run the command again.` | 3.3's row names one variable, and one table entry covers both tokens; the renderer names the variable beside the entry |
| fleet fix list, a fix covering several checks | `fix for: creds, delegation, deploy` | the plain body's own key (Task 20b-i), reused so a grouped entry says what it covers once |
| log body, a query that matched nothing | `no records` | 3.1 keeps the log rule and the record count and writes no empty state |
| fallback table headings | `site`, `verdict`, `failing`, `could not run`, `held`, `engine`, `checked` | the section vocabulary as column headings, plus the engine version the check now reports as a structured field |
| status line under a site listing, a token the run could not find | `CAIRN_CF_READ_TOKEN is not set, so creds, email and errors cannot run` | a listing attempts no check, so the past tense above would report a failure that did not happen; this says what the absence will cost |
| fleet fix list, one remedy covering several sites | `also on: xcathletes.org, cairn.pub` | one remedy is printed once per frame, and the sites it applies to are named in that one entry, ranked, never truncated |

---

## 5. Limits of this pass

Five rewrites need the owner's ear rather than mine. **(1)** `what to fix` is the weakest thing I
wrote; `fixes` is terser and parallels the other lowercase labels, and deleting the label entirely
works if the list sits directly under the table. I chose the clause because a detached list of
imperatives reads as a to-do and should say so, but this is taste, not standard. **(2)** The fix
lines in 3.5 name Cloudflare menu paths and commands I took from `conditions.ts` and the family
docs, not from a running dashboard; anyone who has clicked those menus recently should check
`SSL/TLS, Edge Certificates` and the `wrangler email sending enable` argument shape before they
ship. **(3)** `31 errors in 24h, above the 10 the check allows` invents the threshold's value,
which I do not know; `check_errors.go` holds the real number and the string must use it. **(4)**
The held-line attribution depends on whether the ack record carries an author, which I did not
verify in `internal/health/ack.go`; if it does not, drop that row rather than adding a field to
carry a string. **(5)** I marked `CRITICAL  6 sites  3 CRITICAL · 1 WARNING · 2 OK` as keep,
against my own instinct, because every alternative I tried either dropped the run verdict or
invented a phrase; the ambiguity between the lead word and the tally is real and an owner who
reads that line cold may disagree. One larger caveat: I graded the drafted rewrites in
`family.md` and `usability.md` as suspect and overruled two of their verdicts, but those reviews
saw all 27 renderings and I read the text captures, so where a rewrite of mine reads worse
in a real terminal than on this page, the terminal wins.

---

## Appendix: external exemplars

Gathered from the web on 2026-09-20. Confidence is marked per item. Quotes from a page fetched
directly are verbatim; the rest are flagged.

### clig.dev, Command Line Interface Guidelines

https://clig.dev/ (fetched; quotes verbatim)

> "Human-readable output is paramount." "Humans come first, machines second."

> "Catch errors and rewrite them for humans. If you're expecting an error to happen, catch it and
> rewrite the error message to be useful."

> "Signal-to-noise ratio is crucial. The more irrelevant output you produce, the longer it's going
> to take the user to figure out what they did wrong."

> "Suggest commands the user should run."

> "Display output as formatted JSON if `--json` is passed."

> "Use color with intention. Don't overuse it: if everything is a different color, then the color
> means nothing."

**Why it works.** "Catch errors and rewrite them for humans" is the single rule 4.2 of this
document exists to enforce: `cmd/cairn/main.go:14` does the opposite today. "Put the most important
information at the end of the output" is the same finding `usability.md:69` reached about the green
last line, arrived at independently.

**Where cairn overrides it.** clig.dev recommends "Use symbols and emoji where it makes things
clearer." The admin design system's restraint wins: glyphs yes, emoji never.

### Microsoft Writing Style Guide

https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/s/sorry (fetched;
quotes verbatim)

> "Use *sorry* (and similar wording) only in error messages that notify the customer about a
> serious problem or one that they might find very frustrating."

> "Error messages should apologize only for things that went wrong with the Microsoft product.
> Don't apologize for problems that are outside the product, such as a broken link or waiting for a
> network connection to be found. In those cases, be direct about what went wrong."

**Why it works.** The ban is conditional, not blanket, and the condition is ownership: apologize
only for your own fault. Nearly every cairn CLI message reports someone else's misconfiguration, so
"sorry" is right in none of them. `network down` and `rate limited` are exactly the cases
Microsoft names as not warranting an apology, which is why 3.8 writes them flat.

**Lower confidence.** The dedicated error-messages and text-in-UI pages 404'd on two attempts. The
"describe the problem, then the solution" framing, the sentence-case rule for error text, and the
narrow conditions on "please" are reported from search synthesis and the agent's own knowledge of
Microsoft convention, not from a fetched page. They agree with the fetched "sorry" page's logic and
with the register file at `~/.claude/docs/voice/editor.md`, so this document relies on them, but
anyone hardening the standard should re-fetch those two pages.

### Google Developer Documentation Style Guide

https://developers.google.com/style/code-syntax and https://developers.google.com/style/ui-elements
(fetched; quotes verbatim)

> "Use square brackets around an argument to indicate that it's optional."

> "Use curly braces to indicate that the reader must choose one, and only one, of the items inside
> the braces."

> "Use three dots and no spaces (`...`) to indicate that the reader can specify multiple values."

> "Provide a click-to-copy command example that the reader doesn't need to edit after they copy
> it."

> "In most cases, follow the capitalization as it appears on the page. However, if labels are
> inconsistent or they're all uppercase, use sentence case."

**Why it works.** The click-to-copy rule is the strongest thing here for a fix line: a command an
operator must edit before running is a command that will be run wrong. It is why 2.5 requires the
real command with its real placeholder rather than a description of one. The bracket and brace
conventions govern any usage or synopsis line the tool prints.

**Scope.** Google's material is mostly about writing *about* UI in docs, not about writing runtime
strings, so it governs less of this standard than Microsoft does.

### Monitoring Plugins Development Guidelines (Nagios lineage)

https://www.monitoring-plugins.org/doc/guidelines.html (fetched; quotes verbatim)

> "SERVICE STATUS: Information text"

Four codes: OK (0), WARNING (1), CRITICAL (2), UNKNOWN (3), where UNKNOWN covers "invalid arguments
or low-level plugin failures", meaning the check itself could not run. Performance data is
separated from the human text by a literal `|`, as `'label'=value[UOM];[warn];[crit];[min];[max]`.
The guidelines cap output at 80 characters and require status to travel in the exit code, never in
the text.

**Why it works, and why it settles the Detail question.** This is a three-channel design, and it is
the exact answer to whether Detail should be a token or a sentence. The **status word plus exit
code** is the machine contract. The **information text** is free prose for a person. The
**performance data** behind `|` is structured key-value for a machine. Nothing tries to be two of
those at once. cairn's `hsts-off` in a Detail field is a token living in channel two, which means
some future consumer will parse it and some operator will read it, and it serves neither. The
mapping onto cairn is direct: `condition` plus exit code is channel one, `detail` is channel two,
`Fields` and `--json` are channel three. The UNKNOWN definition also ratifies
`iteration-2-brief.md` ruling 2's "a site where nothing could run is UNKNOWN" as convention, not
invention.

### ShellCheck

https://www.shellcheck.net/wiki/SC2086 (fetched; quote verbatim)

Stable code `SC2086`, then the short human title: "Double quote to prevent globbing and word
splitting." A rationale paragraph, problematic and correct code pairs, and an exceptions section
follow on the wiki page, not in the terminal.

**Why it works.** A stable alphanumeric code carries tooling, deduplication, suppression comments,
and the doc link. A short prose title carries the human read. The paragraph is a third tier the
reader opts into. This is the same shape as `conditions.ts`'s `id` / `title` / `why` /
`remediation`, reached independently, and it is the second argument for 2.11's answer: both a token
and a sentence, in separate fields, with the sentence declared unstable.

### rustc and cargo

rustc-dev-guide plus reproduced diagnostics; search-derived, moderate confidence, not fetched from
source.

```
error[E0308]: mismatched types
   --> src/systems/foo.rs:107:53
    |
107 |     rotate_point_about_origin(points[2], -rot, centre),
    |                               ^^^^^^^^^ expected reference, found struct `Matrix`
    |
help: consider borrowing here: `&points[2]`
```

The style rule, paraphrased from the dev guide: error, warning, note, and help messages start with
a lowercase letter and end with no punctuation, and should be succinct because users see them many
times, with the long explanation behind an opt-in `--explain`.

**Why it works.** Three labelled tiers, `error` / `note` / `help`, keep what is wrong, why, and
what to do on separate lines. The hedge in "consider borrowing here" is deliberate: the compiler may
be wrong about intent, so it suggests rather than commands. That distinction is worth importing.
cairn's checks are mostly high-confidence, so 2.5 specifies a bare imperative, but the two
heuristic checks (`admin.mount-incomplete` in the engine registry says so of itself, and
`publish-path` reads branches best-effort) should hedge the same way rather than command something
they cannot be sure of. `--explain` also argues for keeping the default output short and putting
the rationale behind the doc URL, which is what 2.5 does.

### git's advice lines

Search-derived, well-attested, not fetched from source.

```
hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change.
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and 'development'.
hint: Disable this message with 'git config set advice.defaultBranchName false'
```

**Why it works.** The lowercase `hint:` label makes the block grammatically and visually
subordinate to the real output, and the last line names the exact switch that silences it. Three
moves: state the fact, name the alternatives, name the off-switch. If cairn ever prints an advisory
that an operator will want to stop seeing, this is the shape, and the off-switch is named in the
message, not in the docs.

### brew doctor

Search-derived, commonly reproduced lines.

```
Warning: You have unlinked kegs in your Cellar.
Warning: Unbrewed header files were found in /usr/local/include.
```

**Why it works.** Label, one declarative sentence, the exact location. No adjective beyond the bare
fact, no blame, no heading above the group. This is the closest external match to cairn's WARNING
register, and note what it does not do: it prints no section label, no legend, and no statement
about ordering.

### gh, the GitHub CLI

Search-derived, moderate confidence; exact current wording not verified against `cli/cli`.

Representative: "To get started with GitHub CLI, please run: gh auth login", alongside errors that
surface raw upstream text such as "HTTP 403: Resource not accessible by integration".

**What works and what does not.** Naming the exact next command is right, and 3.8 does it in every
message. The "please" is a counter-example, not a model: Microsoft's condition for "please" is an
inconvenient ask, and running one login command is not one. The raw `HTTP 403` passthrough is the
same defect as cairn's `main.go:14`, which is worth noting: a well-regarded tool can still leak an
upstream string, and nobody catches it because it looks like output.

### elm

Search-derived. Representative headers `-- TYPE MISMATCH --`, with first-person framing elsewhere
("I found...", "I am inferring...").

**The one thing to take, and the thing to refuse.** Take the expected-versus-actual contrast:
restating the expectation and then the reality is a genuinely good structure, and it is what
`0.71.0 installed, 0.78.0 latest` already does. Refuse the persona entirely. Elm's first-person,
playful voice is the single clearest example of a register that would be wrong here: an operator
checking whether a members' site is serving does not want the tool to have feelings about it, and
`admin-design-system.md`'s "never cute or chatty" rules it out by name.
