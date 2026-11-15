Initiative: theme-garden
Round: events
Pass: 1 feed

# Pass 1 `feed`: one calendar feed helper under `/delivery`

Design: `~/Projects/initiatives/theme-garden/specs/2026-11-14-events-design.md`, approved by Geoff
through design document `20261115-055827-bbcf02` (approve at 2026-11-15T06:33:57Z, which is
2026-11-14 in Alaska). Ruling 3 there reads: Ruled: yes, "Reverse it in this narrow form". The
engine gains the feed builder and nothing else. Worktree
`/var/home/glw907/Projects/cairn-cms/.claude/worktrees/events-1`, branch `events-1`, base
`8cf51fe68`. PR base `main`. Class `ordinary`, as the round brief sets it. No file matches an
`auth-data` glob. Two files sit under the `runner` glob `scripts/checks/**`
(`cairn-running-passes` SKILL.md:31): the surface record `check:surface -- --update` regenerates,
and two rows in `check-self-use-allowlist.json`. Both are data no check executes, every export pass
writes them, and `gate-tier --protected --range 8cf51fe68..HEAD` prints nothing on a probe of this
diff. The plan meets the `runner` bar anyway: one `standards:plan-reviewer` read before code and one
whole-branch review at close. Conductor `conductor-events`. The design's
path is 90 minutes; this plan's path is 85 with one pair (sum of task minutes 100). The park line
at planning is 180, and the retry ceiling is 180, twice the approved 90.

## Pre-flight

Owner steps: none. Nothing in this pass needs a sign-in, a secret, a dialog, or a new permission
rule. Its merge publishes nothing (design "What each merge publishes").

- Permissions checked: every task's writes and commands were read against auto mode and the
  denials log (`~/.local/state/claude-denials.jsonl`, 69 rows, 2026-11-01 to 2026-11-15, all of the
  last 30 days the log holds). Classes and rows: Self-Modification 10, server-side classifier
  judgment 10, Interfere With Workloads 9, Classifier unavailable 7, Destructive or Unwanted
  Actions 4, Merge Without Review 3, Auto-Mode Bypass 3, Irreversible Local Destruction 2, Git
  Destructive 2, Create Public Surface 2, Unverifiable Deletion Scope 2, Sensitive-Source
  Provenance 2, Security Weaken 2, Undermining Oversight 2, and one each of Production Deploy,
  Secret-Store Writes, DNS / Domain / Cert Changes, Bot Check Circumvention, Code from External,
  Shared Scratch Sweep, Safety Bypass Flag, Out-of-Place Publication, and PII Data Handling. The
  pass writes repo files only: no `.claude/settings*`, no `.github/**`, no `scripts/release/**`, no
  credential. Its one new public surface is the export the design approves, disclosed through
  `check:surface -- --update`. Two commands carry refusal history: a registry package run in the
  scratchpad (Code from External, 2026-11-09, an unpinned `go run ...@latest`) and the setup command
  compounded and piped to `tail` (Destructive, 2026-11-14). Routes are under "Auto-mode routes".
- Reviewed: one `standards:plan-reviewer` read (Opus, `medium`), with pass-core `planner.md`
  "Stops" and "Pre-flight" added to its prompt. The `runner` bar this pass meets asks for one
  (see the class note above). Findings folded under "Plan review fold".
- Evidence: the mechanism table and the recorded searches below. Every row is a probe run at
  `8cf51fe68` on 2026-11-14 in this worktree, with dependencies installed, or a quoted source line.
  Probes that changed files ran on a detached HEAD and were discarded with `git restore`. M17 and M19 are the plan reviewer's probes, run in a throwaway clone at the same base.

### Auto-mode routes

| Refused class (denials log) | Route this pass takes |
| --- | --- |
| Code from External (an unpinned remote module run) | Item 4's parser is pinned, `ical.js@2.2.1` (published before 2025-08-08), run with `npx -y -p ical.js@2.2.1` in `$CLAUDE_JOB_DIR/tmp/events-1/`, never in the repo. On a refusal, the one alternative is `npm install --no-save --no-package-lock --prefix $CLAUDE_JOB_DIR/tmp/events-1 ical.js@2.2.1` and a plain `import ICAL from 'ical.js'` (M4). A second refusal flags item 4 unmet with the command in the PR (round-run answer 2). |
| Destructive (setup command compounded and piped to `tail`) | Run the setup command bare, alone in its own call. Gates and CI watches run bare, never piped. |
| Interfere With Workloads (`kill`, `pkill`, `claude stop`) | Never stop a process. Background commands stop with `TaskStop`. A hung command runs under `timeout`. |
| Irreversible Local Destruction (`git reset --hard`) | Never. A probe goes on a detached HEAD and is discarded with `git restore` and `git switch`. |
| Safety Bypass Flag (`--no-verify`, a hooks path override) | Never. A failing hook is a defect to fix. |
| Merge Without Review (`gh pr merge`) | Never. The conductor lands the PR through `approval-queue`. |
| Self-Modification (`.claude/settings*`, `stow claude`) | Never. `templates/waymark/.claude/**` changes only through `npm run emit:template`. |
| Classifier unavailable | Retry the same call once after a pause. |

## Mechanism table

| # | Mechanism | Probe or source | Result |
| --- | --- | --- | --- |
| M1 | How `check:surface` renders the new names | Detached-HEAD draft of `icalendar.ts` with the two types, the helper in `responses.ts`, the barrel lines, then `npm run check:surface -- --update` and `git diff scripts/checks/api-surface.md` | First draft, with a shared unexported `interface EventFields`: the leak gate failed, `+ EventFields at /delivery (type-checker)`. Second draft, the union written inline in `ICalendarEvent`: exit 0 and exactly three added lines, `buildICalendarResponse: (calendar: ICalendar) => Response`, `ICalendar: { name: string; productId: string; stamp?: Date; events: ICalendarEvent[] }`, and `ICalendarEvent: { uid: string; summary: string; location?: string; description?: string; url?: string; status?: "cancelled" } & ({ start: \`${number}-${number}-${number}\`; end?: \`${number}-${number}-${number}\` } \| { start: Date; end?: Date })`. A named helper type of any kind is a fourth name, so the types stay as Decision 1 writes them. |
| M2 | The type makes a third start form unrepresentable | `npx tsc --noEmit` over a probe file | `{ start: '2027-06-11', end: new Date() }` is TS2322; `start: '20270611T1830'` is TS2322 ("not assignable to type 'Date \| `${number}-${number}-${number}`'"); `{ start: '2027-06-11', end: '2027-06-13' }` compiles. |
| M3 | A published parser reads the acceptance 1 fixture | The fixture below, written to the scratchpad with `CRLF`, parsed by `parse-full.mjs` (Task 4) under `npx -y -p ical.js@2.2.1` | `events 4`, exit 0, calendar name read from both `NAME` and `X-WR-CALNAME`. Each event's uid, start, end, summary, location, description, and status read back as written: the comma in `Clubhouse, upper room` unescaped, the folded description rejoined (`...lunch.\nWaxes are provided.`), `20270614` as the multi-day end, `(no end)` and `CANCELLED` on the last. `sha256sum` of the bytes: `cc439742c23f4953b5b8bb5c4e61a57e693b2638a15d19124350115857b82faf`. |
| M4 | The `npx` route for a script outside a package | Same scratch dir | A plain `import ICAL from 'ical.js'` under `npx -p` fails with `ERR_MODULE_NOT_FOUND`. Resolving through the `_npx` entry on `PATH` with `createRequire` passes. A malformed file (an unclosed `VEVENT`) throws `ParserError: invalid ical body. component began but did not end` and exits 1, so a parse error cannot pass silently. |
| M5 | An empty calendar | `BEGIN:VCALENDAR`, `PRODID`, `VERSION`, `NAME`, `X-WR-CALNAME`, `END:VCALENDAR`, through the same parser | `events 0`, exit 0. RFC 5545 section 3.6's ABNF asks for one or more components, so the design's "valid empty calendar" follows parsers, not the grammar (Decision 7). |
| M6 | The template mirror of the skill | Appended a line to `skills/cairn-extending-a-site/references/public-routes.md`, ran `node scripts/build/emit-template-dir.mjs --check` | Exit 1: `templates/waymark has drifted from a fresh bake`, `differs: .claude/skills/cairn-extending-a-site/references/public-routes.md`. `templates/waymark/.claude/cairn/MANIFEST` is a file list with no hashes, so editing an existing reference changes no MANIFEST line; a new reference file would. |
| M7 | Fast-lane legs for this pass's diff | Detached-HEAD commit touching `responses.ts`, `public-routes.md`, and `engine-rulings.md`, then `node scripts/checks/gate-tier.mjs --fast --range 8cf51fe68..HEAD` | Whole unit project ("`public-routes.md` is not a path vitest related can select from"), static checks including `check:package`, `check:options`, `check:tiers`, `check:surface`, `check:self-use`, `check:rulings-format`, `check:consumers-must`, `check:snippets`, `check:template`, and `check:public-skill`; no component tests; no e2e. `check:surface` runs on every task, so the task that adds the export commits `api-surface.md`. |
| M8 | Export tests | `src/tests/unit/delivery-exports.test.ts:18` and `:34` | Line 18 lists builders that must stay out of the barrel (`'buildRssFeed', 'buildJsonFeed', 'buildSitemap', 'buildRobots'`); line 34 lists response helpers that must be functions. |
| M9 | Boundary tests | `src/tests/unit/delivery-entry-boundary.test.ts` | Reads every `src/lib/delivery/*.ts` and forbids `from '../github`, `../auth`, `../email`, and `../../lib/(github\|auth\|email)`; walks the barrel graph for static `@sveltejs/kit` and `.svelte` imports. `icalendar.ts` imports nothing, so neither test changes. `delivery-dist-spawn.test.ts` reads `dist` after `npm run package`. |
| M10 | Ledger format | `scripts/checks/check-rulings-format.mjs:13` | `HEADING = /^## ([a-z0-9-]+): .+? {2}\((accept\|decline\|defer\|keep\|reshape\|retire)[,)]/`, two spaces before the parenthesis, and a non-empty `Reopens on:` line per entry. The ledger has 17 `(accept, ` headings. |
| M11 | Ruling 3's words | `~/.local/state/approval-queue/store/20261115-055827-bbcf02/decision-1.json` | `"action": "approve"`, `"at": "2026-11-15T06:33:57.016Z"`, `"q4": { "pick": 0, "label": "Reverse it in this narrow form" }`. `v1.md:45`: "**Reverse it in this narrow form.** The engine gains the feed builder and nothing else." The design's Rulings section dates the document 2026-11-14. |
| M12 | `check:options` | `scripts/checks/check-options.mjs` roots | Walks `define*`/`create*` exports plus named extras, so `ICalendar` is not walked. Members get doc comments anyway (Decision 1). |
| M13 | The calendar name on the wire | RFC 7986 section 5.1 (`NAME`, "the name of the calendar", TEXT); community reports that Google Calendar reads `X-WR-CALNAME` ([Discourse Meta thread](https://meta.discourse.org/t/the-webcal-url-is-incorrectly-passed-to-the-calendar-name-field-in-google-calendar/400167), [Zoho community](https://help.zoho.com/portal/en/community/topic/ical-feed-calendar-name-problem)) | No Google page documents it. The feed writes both (Decision 4). |
| M14 | The rest of the wire format | RFC 5545: 3.1 (CRLF content lines, "SHOULD NOT be longer than 75 octets", fold by CRLF plus one space, multi-octet characters not split); 3.3.11 (TEXT escapes `\\`, `\;`, `\,`, `\n`); 3.3.4 (DATE `YYYYMMDD`); 3.3.5 (UTC DATE-TIME `YYYYMMDDTHHMMSSZ`); 3.6.1 (VEVENT needs `UID` and `DTSTAMP`); 3.7.3 `PRODID`; 3.7.4 `VERSION:2.0`; 3.8.2.2 (`DTEND` is the non-inclusive end); 3.8.1.11 (`STATUS:CANCELLED`); 3.8.4.6 (`URL` is a URI value, unescaped) | Each fixture line below cites one of these. |
| M15 | Response shape to copy | `src/lib/delivery/responses.ts:14-18` | `new Response(buildRssFeed(channel, items), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })`, with a TSDoc block tagged `@public` that names the content type and says no cache header is set. |
| M17 | `check:self-use` on the new export | Plan review: Decision 1's draft in a throwaway clone, `npm run package`, `node scripts/checks/check-self-use.mjs` | Exit 1: `ICalendarEvent` and `buildICalendarResponse` need "allowlist or showcase call site" (`ICalendar` passes, since `responses.ts` uses it). With two entries in `scripts/checks/check-self-use-allowlist.json` (`{ name, ledger, reason }`, `check-self-use.mjs:206`): `check-self-use OK (271 public exports, 72 allowlisted)`. |
| M18 | The close gate's class flag | `scripts/checks/gate-tier.mjs:151` | `PASS_CLASSES = ['auth-data', 'engine-logic', 'paint', 'sweep', 'docs', 'tool']`, and only `auth-data` changes the output. `--class ordinary` exits 1 (`unknown --class "ordinary"`). The close gate passes no `--class`. |
| M19 | Hostnames in `src/lib` comments | `scripts/checks/check-idioms.mjs:294-319`, plan review probe | Rule 6 allows `example.com` and refuses `example.org` and `rfc-editor.org`: a doc comment citing either fails `check:idioms`. Tests are outside the rule. |
| M16 | The skill's charset caveat | `skills/cairn-extending-a-site/references/public-routes.md:92-94` | "The helpers' `; charset=utf-8` holds only on a Worker-rendered route. A prerendered route's `Content-Type` comes from Cloudflare's asset layer". The new paragraph points at it. |

## Recorded searches

All `git grep -n -I` at `8cf51fe68` with `':!docs/internal/plans'`.

| Search | Hits |
| --- | --- |
| `buildRssResponse` | 21. Change sites: `src/lib/delivery/index.ts:31` (the export line), `src/tests/unit/delivery-exports.test.ts:34`, `src/tests/unit/delivery-responses.test.ts:2`, `scripts/checks/api-surface.md:164` (regenerated), `skills/cairn-extending-a-site/references/public-routes.md:84` and its template mirror. Dismissed: `CHANGELOG.md:339` (a past entry), the showcase and template `feed.xml/+server.ts` (RSS routes), `src/tests/unit/delivery-data-split.test.ts:12`, `src/tests/unit/fixtures/gate-pages/release-body-v0.99.0-rc.3.md:173`, and `.claude/skills/cairn-writing-docs/evals/site-cases/S08-public-routes.json` (four lines, an eval case about RSS). |
| `text/calendar` | 0 |
| `icalendar\|iCalendar\|ICalendar` | 0, so no name collides |
| `X-WR-CALNAME` | 0 |
| `ical-builder` | 1: `docs/internal/engine-rulings.md:294`, the entry Task 3 rewrites |
| `fixed-concept`, `no events`, `no-events` in `engine-rulings.md` | 1: line 295, the same entry's `Reopens on:`. Ruling 3 names "the reversal of `ical-builder` and the no-events ruling"; the ledger has no separate no-events entry, so the one entry carries both (Decision 9). |
| `delivery` in `scripts/checks/gate-table.json` | 1: `:191`, the `src/lib/delivery/` prefix that sends CI's e2e job to seven specs. The fast lane runs none. |
| Pennant pass 1's row (its plan, "Scope") | Holds `skills/cairn-extending-a-site/**` and `templates/waymark/.claude/**`. Its T5 edits `components-and-islands.md`, a different file from this pass's `public-routes.md`. The design's "shares only `CHANGELOG.md` and `MIGRATION-NOTES.md`" is stale (`[stale-fact]`, Close step 2). |

## Scope

Files (the design's row): `src/lib/delivery/{icalendar,responses,index}.ts`,
`src/tests/unit/delivery-*.test.ts`, `scripts/checks/api-surface.md`,
`docs/internal/engine-rulings.md`, `skills/cairn-extending-a-site/**`, `CHANGELOG.md`,
`MIGRATION-NOTES.md`.

Added by this plan, each flagged under "Planning misses":

- `templates/waymark/.claude/skills/cairn-extending-a-site/references/public-routes.md`, written
  only by `npm run emit:template` (M6).
- `scripts/checks/check-self-use-allowlist.json`, two entries only (M17).
- `BACKLOG.md`, written only by `standards:log-issue`.
- This plan and its executor prompt, deleted at Close (`cairn-running-passes` SKILL.md:10).

Never touched: `tool/**`, `themes/**`, `examples/**`, `src/lib/` outside `src/lib/delivery/`,
`docs/STATUS.md` (except a `## Stop` section on the branch, per `round-run.md` "Stops"),
`.github/**`, `scripts/release/**`, `.claude/settings*`, `package.json`, and `package-lock.json`. The pass never runs `make -C tool check` and opens nothing under `tool/`. A
task that needs a held or untouched path parks the pass.

## Decisions made at planning

1. **Names and types.** The module is `src/lib/delivery/icalendar.ts`. It exports the types
   `ICalendar` and `ICalendarEvent`, each tagged `@public`, and the string builder
   `buildICalendar`, which the barrel does not export. `buildICalendarResponse` lives in
   `responses.ts`. The types are written exactly as M1's passing draft, with a TSDoc comment on
   each member (and none of them a named helper type):

   ```ts
   export type ICalendarEvent = {
     uid: string;
     summary: string;
     location?: string;
     description?: string;
     url?: string;
     status?: 'cancelled';
   } & (
     | { start: `${number}-${number}-${number}`; end?: `${number}-${number}-${number}` }
     | { start: Date; end?: Date }
   );

   export interface ICalendar {
     name: string;
     productId: string;
     stamp?: Date;
     events: ICalendarEvent[];
   }
   ```

   A date start pairs only with a date end, and an instant with an instant (M2). `productId` is
   the RFC's formal public identifier, such as `-//Example Club//Events//EN`.
2. **No runtime validation.** The design's "How it fails" names two feed rows (folding and the
   empty calendar). Date and time checks belong to the site's schema `refine` (pass 2). The
   builder adds no `RangeError` path; an invalid `Date` throws from `toISOString` as it does
   anywhere. The doc comment states the contract: a date is `YYYY-MM-DD`, an all-day `end` is on or
   after `start`, a timed `end` is after `start`.
3. **Order on the wire.** Calendar: `BEGIN:VCALENDAR`, `PRODID`, `VERSION:2.0`, `NAME`,
   `X-WR-CALNAME`, the events in input order, `END:VCALENDAR`. Event: `BEGIN:VEVENT`, `UID`,
   `DTSTAMP`, `DTSTART`, `DTEND` when written, `SUMMARY`, then `LOCATION`, `DESCRIPTION`, `URL`,
   and `STATUS` when present, `END:VEVENT`. The output ends with a `CRLF`. No `CALSCALE`, `METHOD`,
   `RRULE`, `RECURRENCE-ID`, or `SEQUENCE`.
4. **The calendar name** is written twice, as `NAME` (RFC 7986) and `X-WR-CALNAME` (what Google
   reads, M13). `[design-gap]`: the design names "a calendar name" and no property.
5. **Values.** An instant is `toISOString()` with `-`, `:`, and the milliseconds removed
   (`20270114T033000Z`); milliseconds are dropped. A date is parsed into year, month, and day and
   written `YYYYMMDD` from `Date.UTC`, so the exclusive end is `Date.UTC(y, m - 1, d + 1)` and
   crosses month and year ends. An all-day event with no `end` gets `DTEND` one day after its
   start: the design says all-day events are written "with an exclusive end". A timed event with
   no `end` gets no `DTEND`, which RFC 5545 3.6.1 reads as a point in time. `[design-gap]`: the
   design is silent on a timed event with no end.
6. **Escaping.** `UID`, `SUMMARY`, `LOCATION`, `DESCRIPTION`, `PRODID`, `NAME`, and `X-WR-CALNAME`
   are TEXT: `\` first becomes `\\`, then `;` becomes `\;` and `,` becomes `\,`, then each `\r\n`,
   `\r`, or `\n` becomes `\n`. `URL` is a URI and is written as given. Other control characters
   pass through unchanged; a site's text arrives from its own schema. RFC 5545 3.3.11's
   `TSAFE-CHAR` excludes them, so the doc comment states the contract: text carries no control
   character but a newline or a tab, and `url` is a URI with no line break.
7. **The empty calendar** is the header and footer with no `VEVENT` (M5). Parsers accept it; RFC
   5545's ABNF strictly wants a component. `[design-gap]`, recorded in the PR's `## Decisions`.
8. **Folding.** Each content line is folded on code points (`for...of` over the string, octets
   counted with one `TextEncoder`): the first physical line holds at most 75 octets, each
   continuation is one space plus at most 74 octets, and a character never splits. Folds join
   with `\r\n `.
9. **The ledger entry** rewrites `ical-builder` in place, so the slug the old decline used stays
   the one entry for the question and its `grep '^## '` row reads the current verdict. The text is
   in Task 3.
10. **The fixture** is the block in Task 1, written by the planner by hand from RFC 5545 and
    checked only by the parser (M3). The implementer copies it; it never derives it from the
    builder's output. The test also asserts the fixture's `sha256` equals M3's, which proves the
    bytes item 4 parses are the bytes the test compares.
11. **The date type stays a template literal.** `${number}-${number}-${number}` refuses a plain
    `string`, so pass 2's occurrences code narrows or casts a schema string before it builds an
    event. A named helper type would add a surface name (M1), so the type stays. The PR's
    `## Decisions` names this for the pass 2 planner.

## Standing answers

From the round design and `round-run.md`. A stop with none parks the pass.

1. (round-run 1) Retry up to twice the approved path minutes (180) while each retry fixes a
   traced cause.
2. (round-run 2) An auto-mode refusal: use the named alternative in "Auto-mode routes" once;
   after a second refusal, flag the task and go on.
3. (round-run 3) A needed setting change goes into the PR's `## Before merge` commands, never into
   a task.
4. (round-run 8) A plan step that can't go as written takes the advisor's choice, flagged.
5. (round-run 12) An acceptance item that can't be met as written is amended per `advisor.md`
   "Acceptance items" and flagged. No item is dropped.
6. (Design 18) A reviewer wants a month grid, sign-up, an import, a per-event download, a repeat
   rule, or a time zone: file it through `standards:log-issue` and never build it.
7. (Design 19) Item 4's parser runs with `npx` in the scratchpad and adds no dependency.
8. A reviewer or the fixture shows a fixture line wrong against RFC 5545: fix the fixture line from
   the RFC section, never from the builder's output. In one commit, edit the test's line array,
   the plan's fixture block, and M3's hash, then re-run T4's extraction, parse, and hash, so the
   test and item 4 still read the same bytes. Record the change under `## Planning misses` with
   the section.
9. `origin/main` moved before close: merge it in (`git merge origin/main`), resolve
   `CHANGELOG.md` and `MIGRATION-NOTES.md` by keeping both sides' entries, and resolve a conflict
   in a file under `templates/` by taking `origin/main`'s side. Then run `npm run emit:template`
   and commit its output. Never hand-merge a file under `templates/`. After the merge, every
   range and evidence diff uses `origin/main..HEAD` in place of `8cf51fe68..HEAD`, so the gate and
   item 5 and 6's diffs read this branch's changes and not the merged-in work.
10. Cleanup found on the way that is not in this plan: file it through `standards:log-issue` and
    list it in the PR. Never do it.

Run rules the lens requires:

- Each accepted task's report names the CI verdict on that head, or says CI has not run on it.
- After the whole-branch review, a Low finding from a delta read is folded once, checked by the
  session's own diff read and CI, or filed through `standards:log-issue`. It never starts another
  review round.
- If an acceptance item becomes unreachable mid-run, every other item still runs; the pass
  closes, and the PR reports that item unmet with its cause at the top of the body.

## Tasks

Every task goes to `cairn-implementer` in its own worktree off the pass branch. Task 1 runs at
Opus, `medium`, because folding and escaping are correctness-critical; the rest at Sonnet,
`medium`. Each implementer loads `cairn-writing-engine-code`, `cairn-judging-scope`, and
`standards:ts-conventions` before TypeScript. Code comments follow TSDoc, write the contract and the
why, and never use the em dash.

After each task commits, from the pass worktree:

```sh
npm run lane:fast -- --range 8cf51fe68..HEAD
```

Path: (T1 beside T3) → T2 → T4. 40 + 20 + 25 = 85 minutes on the path; the sum of all tasks is
100. T3 touches only Markdown files T1 never opens.

### T1. The builder, the helper, and the tests (40 min, Opus)

1. `src/lib/delivery/icalendar.ts`: a one-line `// cairn-cms:` header in the style of
   `responses.ts:1-3`, the types of Decision 1, and `buildICalendar(calendar: ICalendar): string`
   per Decisions 2 to 8. The module imports nothing. Its doc comment states the input contract
   (Decision 2), that an all-day `end` is inclusive, that a timed event with no `end` is a point
   in time (Decision 5), the text and `url` contract (Decision 6), and that the builder does no
   time zone math and writes no repeat rule. Comments in `src/lib` cite "RFC 5545 section N" with
   no URL, and any example host is `example.com` (M19).
2. `src/lib/delivery/responses.ts`: `buildICalendarResponse(calendar: ICalendar): Response`, after
   `buildRssResponse`'s shape (M15), with `Content-Type: text/calendar; charset=utf-8` and a TSDoc
   block tagged `@public` that names the content type, says no cache header is set, and points at
   the input types.
3. `src/lib/delivery/index.ts`: add `buildICalendarResponse` to the `./responses.js` line, and
   `export type { ICalendar, ICalendarEvent } from './icalendar.js';` beside the feed types.
4. `src/tests/unit/delivery-exports.test.ts`: add `'buildICalendar'` to the list at `:18` and
   `'buildICalendarResponse'` to the list at `:34`.
5. `src/tests/unit/delivery-responses.test.ts`: one test that the helper's `Content-Type` is
   `text/calendar; charset=utf-8` and the body starts `BEGIN:VCALENDAR\r\n`.
6. `src/tests/unit/delivery-icalendar.test.ts`, through `buildICalendarResponse` and the response's
   bytes (`new Uint8Array(await res.arrayBuffer())`):
   - Acceptance 1. Input:

     ```ts
     const calendar: ICalendar = {
       name: 'Example Club events',
       productId: '-//Example Club//Events//EN',
       stamp: new Date('2027-01-01T00:00:00Z'),
       events: [
         { uid: 'map-night-2027-01-13@example.org', start: new Date('2027-01-14T03:30:00Z'), end: new Date('2027-01-14T05:00:00Z'), summary: 'Map night', location: 'Clubhouse, upper room', url: 'https://example.org/events/map-night' },
         { uid: 'field-day-2027-06-05@example.org', start: '2027-06-05', summary: 'Field day' },
         { uid: 'waxing-course-2027-06-11@example.org', start: '2027-06-11', end: '2027-06-13', summary: 'Waxing course', description: 'Three days at the upper lot. Bring skis, boots, and lunch.\nWaxes are provided.' },
         { uid: 'field-day-2027-06-19@example.org', start: new Date('2027-06-20T01:00:00Z'), summary: 'Cancelled: Field day', status: 'cancelled' },
       ],
     };
     ```

     The fixture, copied line for line as an array of strings joined with `'\r\n'` plus a final
     `'\r\n'`. Each line's section is RFC 5545 unless marked; the comment column is not part of
     the line.

     ```text
     BEGIN:VCALENDAR                                   3.4
     PRODID:-//Example Club//Events//EN                3.7.3
     VERSION:2.0                                       3.7.4
     NAME:Example Club events                          RFC 7986 5.1
     X-WR-CALNAME:Example Club events                  3.8.8.2 (x-name)
     BEGIN:VEVENT                                      3.6.1
     UID:map-night-2027-01-13@example.org              3.8.4.7
     DTSTAMP:20270101T000000Z                          3.8.7.2, 3.3.5
     DTSTART:20270114T033000Z                          3.8.2.4, 3.3.5
     DTEND:20270114T050000Z                            3.8.2.2
     SUMMARY:Map night                                 3.8.1.12
     LOCATION:Clubhouse\, upper room                   3.8.1.7, 3.3.11
     URL:https://example.org/events/map-night          3.8.4.6
     END:VEVENT
     BEGIN:VEVENT
     UID:field-day-2027-06-05@example.org
     DTSTAMP:20270101T000000Z
     DTSTART;VALUE=DATE:20270605                       3.3.4
     DTEND;VALUE=DATE:20270606                         3.8.2.2 (non-inclusive)
     SUMMARY:Field day
     END:VEVENT
     BEGIN:VEVENT
     UID:waxing-course-2027-06-11@example.org
     DTSTAMP:20270101T000000Z
     DTSTART;VALUE=DATE:20270611
     DTEND;VALUE=DATE:20270614
     SUMMARY:Waxing course
     DESCRIPTION:Three days at the upper lot. Bring skis\, boots\, and lunch.\nW    3.8.1.5, 3.1 (75 octets)
      axes are provided.                               3.1 (one leading space)
     END:VEVENT
     BEGIN:VEVENT
     UID:field-day-2027-06-19@example.org
     DTSTAMP:20270101T000000Z
     DTSTART:20270620T010000Z
     SUMMARY:Cancelled: Field day
     STATUS:CANCELLED                                  3.8.1.11
     END:VEVENT
     END:VCALENDAR
     ```

     The fold line is `DESCRIPTION:Three days at the upper lot. Bring skis\, boots\, and lunch.\nW`
     (75 octets) and the next is ` axes are provided.` (a space, then 18 octets). The test asserts
     the bytes equal the fixture's, that
     `createHash('sha256').update(fixture).digest('hex')` is
     `cc439742c23f4953b5b8bb5c4e61a57e693b2638a15d19124350115857b82faf` (`node:crypto`), and each
     named property of item 1 on its own: every line ends `\r\n`, `VERSION:2.0` and the `PRODID`
     appear, `DTSTAMP` appears four times, every timed `DTSTART` ends `Z`, `STATUS:CANCELLED`
     appears once, and `DTEND;VALUE=DATE:20270614` appears.
   - Acceptance 2. A summary of `'é'.repeat(60)`: split the body on `\r\n`; every line is at most
     75 octets and `new TextDecoder('utf-8', { fatal: true }).decode()` of its bytes does not
     throw; unfolding (remove each `\r\n ` and read the `SUMMARY:` line) gives the input back. Add
     the same check for a run of a four-byte character (`'🎿'.repeat(30)`), so a surrogate pair
     never splits.
   - Acceptance 3. A summary `a,b;c\d` plus a newline plus `e` appears on the wire as
     `SUMMARY:a\,b\;c\\d\ne`. Add one case each for `\r\n` and a lone `\r`, both giving `\n`.
   - The empty calendar: `events: []` gives the five header lines and `END:VCALENDAR`, no `VEVENT`.
   - Day rollover: an inclusive all-day end of `2027-12-31` writes `DTEND;VALUE=DATE:20280101`, and
     `2028-02-28` writes `20280229`.
   - The default stamp: with `vi.useFakeTimers()` and `vi.setSystemTime(new Date('2027-03-01T12:00:00Z'))`,
     an omitted `stamp` writes `DTSTAMP:20270301T120000Z`; restore real timers after.
   - The body never contains `RRULE`, `RECURRENCE-ID`, or `SEQUENCE`.
7. Run `npm run package`, then `npm run check:surface -- --update`. Confirm the diff of
   `scripts/checks/api-surface.md` is exactly M1's three lines, and commit it with this task.
   Add two entries to `scripts/checks/check-self-use-allowlist.json`'s `entries`, in the file's
   order, for `buildICalendarResponse` and `ICalendarEvent`, each
   `{ "name": ..., "ledger": "ical-builder", "reason": ... }`. The reason says the export is for a
   site's own feed route: the engine never builds a calendar feed, and pass 2's events route is
   the first caller. Run `node scripts/checks/check-self-use.mjs` and commit the file with this
   task (M17).
8. Confirm both boundary test files are unchanged:
   `git diff --quiet 8cf51fe68 -- src/tests/unit/delivery-entry-boundary.test.ts src/tests/unit/delivery-dist-spawn.test.ts`.
   The fast lane then runs `check:tiers`, `check:options`, `check:package`, `check:surface`,
   `check:self-use`, and the whole unit project (M7), so the task runs none of them twice.

Done when the new tests pass and the fast lane is green. Acceptance: 1, 2, 3, 5, 6.

### T2. The skill section (20 min, after T1)

1. Load `cairn-writing-docs` (its register for packaged skills) and `writing-voice`. In
   `skills/cairn-extending-a-site/references/public-routes.md`, under `## Feeds, sitemap, robots`,
   add a bullet or short paragraph for the calendar feed: a `+server.ts` GET returns
   `buildICalendarResponse({ name, productId, events })`; the site hands it one event per
   occurrence, each a `YYYY-MM-DD` date (an all-day `end` is the last day, inclusive) or a UTC
   `Date`; the site turns a wall time and its zone into that instant and writes repeats as
   separate events; a cancelled occurrence stays in the feed with `status: 'cancelled'`. Point at
   the charset caveat below it (M16) rather than repeating it. Add a short `ts` snippet with real
   imports from `@glw907/cairn-cms/delivery`, so `check:snippets` type-checks it against T1's
   export; use no `snippet-check-skip` marker unless the check cannot resolve a name, and then
   give the marker its reason.
2. Update the SKILL.md router row at `skills/cairn-extending-a-site/SKILL.md:37` to read
   "feeds, calendar feed," so a reader routes there. `check:package` runs
   `scripts/checks/check-skill-budget.mjs` in the fast lane.
3. `npm run emit:template`, then commit the skill files and the regenerated
   `templates/waymark/.claude/skills/cairn-extending-a-site/references/public-routes.md` (and
   `SKILL.md` mirror) together. `npm run check:template` passes.
4. Run `npm run check:snippets` and `npm run check:leaks`. No automated check grades the register
   of a packaged skill (`check:prose` reads only admin and public `.svelte` strings), so the
   whole-branch review reads these pages against the `cairn-writing-docs` register.

Acceptance: every-pass item 2 (the skill page).

### T3. Ledger, changelog, and migration notes (15 min, beside T1)

1. `docs/internal/engine-rulings.md:294-295`: replace the `ical-builder` entry with:

   ```markdown
   ## ical-builder: iCal feed builder  (accept, 2026-11-14, events design 20261115-055827-bbcf02)

   - **Verdict:** accept, in a narrow form. Geoff ruled "Reverse it in this narrow form" (design document `20261115-055827-bbcf02`, ruling 3): the engine gains the feed builder and nothing else. `/delivery` exports `buildICalendarResponse` and its input types `ICalendar` and `ICalendarEvent`.
   - **Shape:** one response helper over plain events, each starting on a date or at a UTC instant. The engine does no time zone math and writes no `RRULE`, `RECURRENCE-ID`, or `SEQUENCE`. It gains no events concept and no time or repeat field; those stay site code.
   - **Reopens on:** A site needs a repeat rule, a time zone, or a sequence number in the feed, shown in code it has built, or a design proposes an events concept for the engine.
   - **Record:** Reverses the 2026-08-05 decline (ASC consumer-brief scope check), which reopened on "Deliberate reopening of the fixed-concepts model by an events-content decision". The events design is that decision.
   ```

   Run `npm run check:rulings-format`.
2. `CHANGELOG.md` under `## Unreleased`, below `<!-- release-size: minor -->` and above the first
   bullet: one bold-lead bullet, "**`/delivery` adds `buildICalendarResponse`, a calendar feed
   members can subscribe to.**" then two or three sentences on what it takes and writes (dates or
   UTC instants, an inclusive all-day end, `text/calendar; charset=utf-8`, no repeats or zones),
   then a blank line and `  Consumers must: nothing.` Run `npm run check:consumers-must`.
3. `MIGRATION-NOTES.md` under `## Unreleased` (line 85): one short paragraph in that section's
   voice: the export is new, a site opts in by adding a route, and nothing that exists changes.
4. T3 runs beside T1 on a tree without the export, so its text uses inline code spans only and no
   fenced block that imports the new names: `check:snippets` reads `MIGRATION-NOTES.md`
   (`check-snippets.mjs:72`) and would fail against the base `dist`.

Acceptance: 7, every-pass item 2.

### T4. The parser check, then close (25 min)

1. In `$CLAUDE_JOB_DIR/tmp/events-1/`, write `fixture.ics` from the plan's fixture block with the
   comment column stripped and each line ending `\r\n`. This command, run from the pass worktree,
   produced M3's hash at planning:

   ```sh
   awk '/^     ```text$/{f=1;next} f&&/^     ```$/{f=0} f' docs/internal/plans/2026-11-14-events-1-feed-plan.md | sed -E 's/^     //; s/ {2,}(3\.|RFC ).*$//; s/$/\r/' > "$CLAUDE_JOB_DIR/tmp/events-1/fixture.ics"
   ```

   Run it before Close deletes the plan, and check `sha256sum fixture.ics` prints M3's hash.
   Write `parse-full.mjs`:

   ```js
   // One-off item 4 check: parse an .ics with ical.js from an npx install and print each event.
   import { readFileSync } from 'node:fs';
   import { createRequire } from 'node:module';
   import { join, dirname } from 'node:path';
   const bin = process.env.PATH.split(':').find((p) => p.includes('_npx'));
   const ICAL = createRequire(join(dirname(bin), 'x.js'))('ical.js');
   const comp = new ICAL.Component(ICAL.parse(readFileSync(process.argv[2], 'utf8')));
   const events = comp.getAllSubcomponents('vevent');
   console.log('calendar', comp.getFirstPropertyValue('x-wr-calname'), '|', comp.getFirstPropertyValue('name'));
   console.log('events', events.length);
   for (const e of events) {
     const ev = new ICAL.Event(e);
     console.log(ev.uid, ev.startDate.toString(), e.hasProperty('dtend') ? ev.endDate.toString() : '(no end)', JSON.stringify(ev.summary), JSON.stringify(ev.location), JSON.stringify(ev.description), e.getFirstPropertyValue('status'));
   }
   ```

   Run `npx -y -p ical.js@2.2.1 node parse-full.mjs fixture.ics` from that directory. Paste the
   command, the hash line, and the full output into the PR under item 4. It must print
   `events 4` and exit 0.
2. The steps under "Close".

Acceptance: 4.

## Acceptance

Copied verbatim from the design, each mapped to its task and its evidence.

1. A unit test builds a feed of four events (timed, all-day, multi-day, cancelled) with a fixed `stamp` and compares it byte for byte with a fixture written by hand from RFC 5545, never generated by the code. The fixture has `CRLF` line ends, `VERSION:2.0`, the `PRODID`, a `DTSTAMP` in every event, a `Z` on every timed start, `STATUS:CANCELLED` on the cancelled event, and for a three-day event starting 2027-06-11 the line `DTEND;VALUE=DATE:20270614`.
   - T1 step 6. Evidence: the test's name and pass line in CI's unit job; the fixture is the planner's block (Decision 10), and its hash ties it to item 4.
2. A test feeds a summary of 60 two-byte characters. Every physical line is at or under 75 octets and decodes as UTF-8 by itself under a fatal decoder, and the summary equals the input after unfolding.
   - T1 step 6. Evidence: the test's pass line in CI.
3. A test holds that a comma, a semicolon, a backslash, and a newline in a summary appear on the wire as `\,`, `\;`, `\\`, and `\n`.
   - T1 step 6. Evidence: the test's pass line in CI.
4. The fixture parses with a published iCalendar parser run as a one-off check, with its output in the PR, and the parser reports four events and no error.
   - T4 step 1. Evidence: the command, the `sha256sum` line matching the test's constant, and the parser output in the PR body.
5. `npm run check:tiers`, `check:surface`, `check:options`, and `check:package` pass, and `api-surface.md` lists `buildICalendarResponse` with its two types and no other new name.
   - T1 steps 7 and 8. Evidence: `git diff 8cf51fe68 -- scripts/checks/api-surface.md` (or `origin/main..HEAD` after a merge, standing answer 9) in the PR showing three added lines and no removed line; the fast lane and CI run each check, and `check:self-use` with them (M17).
6. `delivery-entry-boundary.test.ts` and `delivery-dist-spawn.test.ts` pass unchanged.
   - T1 step 8. Evidence: `git diff --stat 8cf51fe68 -- src/tests/unit/delivery-entry-boundary.test.ts src/tests/unit/delivery-dist-spawn.test.ts` (the same range rule) prints nothing, and both pass in CI.
7. `docs/internal/engine-rulings.md` carries the reversal with Geoff's ruling quoted.
   - T3 step 1. Evidence: the entry's diff, and `check:rulings-format` passing.

Every pass:

1. The fast lane and CI are green on the head commit.
   - Close steps 4 and 5. Evidence: the `ci-green` verdict on the final head in the PR.
2. Each page written for a person follows the repo's docs register (`cairn-writing-docs`).
   - T2, T3. Evidence: the whole-branch review reads the skill section, the changelog bullet, and
     the migration paragraph against the `cairn-writing-docs` register and `writing-voice`, with
     `check:leaks` as the floor. No automated check grades these pages' register (T2 step 4).

## Close

1. Merge `origin/main` in if it moved since `8cf51fe68` (standing answer 9). Pennant pass 1 may
   have merged first; its skill edit is in a different file, so the emit resolves the mirror.
2. Run `npm run emit:template` and `npm run check:template` after any merge.
3. Dispatch one whole-branch `standards:diff-reviewer` (Opus, `medium`) against this plan and the
   design's "The feed" section. Fold what it finds, then a Low from a delta read per the run
   rules.
4. Run the targeted gate from the pass worktree:
   `cairn-run-gate "$(node scripts/checks/gate-tier.mjs --range 8cf51fe68..HEAD)"`, with
   `origin/main..HEAD` as the range after a merge. It passes no `--class`, since `gate-tier`
   accepts none of the risk-class names but `auth-data` (M18).
5. Delete this plan and the executor prompt in one commit, push, and run
   `ci-green <sha> --pr <n> --wait` as a background task on that head.
6. The PR body opens with a paragraph per `~/.claude/docs/voice/written-for-people.md`, then
   carries `Round: events`, `Pass: 1 feed`, `Review: accept, open findings 0` (or the real verdict),
   and `Calls: none`, then `## Acceptance` with every item above and its evidence, item 4's
   output, `## Decisions` (Decisions 4, 5, and 7 first, the `[design-gap]` calls, then Decision
   11's note for pass 2), `## Planning
   misses`, any filed backlog items, and the score per pass-core `references/executor.md`. No
   `## Before merge` section unless a refusal forced one.
7. Mark the PR ready and end. The conductor reads it and lands it (round-run "Reading a pass").

## Planning misses

- `[file-list]` The design's row omits the template mirror of the skill page, which
  `check:template` fails on (M6). Added, written only by the emit.
- `[stale-fact]` The design says pass 1 shares only `CHANGELOG.md` and `MIGRATION-NOTES.md` with
  Pennant. Pennant pass 1's row also holds `skills/cairn-extending-a-site/**` and the template
  mirror. Handled by standing answer 9 and Close step 2.
- `[file-list]` The design's row omits `scripts/checks/check-self-use-allowlist.json`, which the
  new export fails without (M17). Added, two entries only. Found by the plan review.
- `[stale-fact]` The round brief's close gate passes `--class ordinary`, which `gate-tier` refuses
  (M18). Close step 4 passes no class. Found by the plan review.
- `[design-gap]` The calendar name's property (Decision 4), a timed event with no end (Decision
  5), and the empty calendar's form (Decision 7).
- `[mechanism]` A named helper type for the shared event fields fails the surface leak gate and
  would add a name item 5 forbids (M1), so the union is written inline.

## Plan review fold

One `standards:plan-reviewer` read (Opus, `medium`) probed the plan in a throwaway clone. It
found the fixture, the parse, and Decisions 3 to 8 sound against RFC 5545, and the ledger entry
passing `check-rulings-format`. Every finding is folded:

- Blocker: `check:self-use` fails on the new export. Added M17, the allowlist file to Scope, and
  T1 step 7's two entries.
- Blocker: `--class ordinary` is refused. Added M18 and fixed Close step 4 and the executor prompt.
- High: two files sit under the `runner` glob. The class stays `ordinary` as the brief sets it, the
  header records the match, and the plan meets the `runner` review bar.
- High: standing answer 8 now edits the test, the plan's block, and M3's hash in one commit.
- Medium: comments in `src/lib` cite no URL and use `example.com` (M19, T1 step 1).
- Medium: after a merge every range uses `origin/main..HEAD` (standing answer 9, Close step 4,
  items 5 and 6).
- Medium: every-pass item 2's evidence is the review against the register, not `check:prose`.
- Medium: the plan and the prompt are committed as the branch's first commit before launch.
- Medium: the main checkout is one commit behind (`8cf51fe68`, `BACKLOG.md` only). Two busy
  conductors hold it, so the planner left it unpulled per pass-core "Close" and reported it. The
  executor never runs in the main checkout.
- Low: T1 step 8 no longer repeats the fast lane's checks; T2 names the skill-budget script;
  Decision 5 is a `[design-gap]`; Decision 6 states the text contract; Decision 11 notes the
  date type for pass 2; `docs/STATUS.md` allows a `## Stop`; standing answer 9 covers a
  `templates/` conflict; T3 uses inline code only.
