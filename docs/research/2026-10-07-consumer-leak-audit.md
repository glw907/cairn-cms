# Consumer-context leak audit (2026-10-07)

Read-only audit by a dispatched agent on draft-docs-2a. The published-docs lane (`f702495b..a72250ca`) and the code lane (`leak-cleanup` branch) acted on it. Line numbers are from the audit's run and have since moved.


**What I found:** the club leak goes well beyond the four words the other agent is fixing. The Alaska Sailing Club's membership model reaches public readers in three more places:
- **"Households":** ASC's membership model, with the standings Current, Former, Overdue and Holding assets.
- **The "Club" nav section:** it rides the `navLayout` worked example.
- **ASC's member screens:** the shipped skill exemplars are taken from them.

These reach readers through the reference pages, the TSDoc on exports, the docs reproductions on cairn.pub, and the skills copied into every scaffolded site. Separately, the `cairn` CLI's own `--help` examples name `ecxc-ski`, and the template that every site copies carries "(Geoff, 2026-07-05)" and "Modeled on the live 907-life cairn site".

I edited nothing. The other agent was editing `docs/reference/{admin-toolkit,admin,auth-channel,core,sveltekit}.md`, `docs/extend/{add-a-custom-admin-screen,add-a-second-sign-in-group,restrict-admin-access}.md`, `facts/{extend,front-door}.md`, the two brief sets and the register while I ran. Line numbers are from my last sweep. Hits I watched disappear during the run: Anchorage, the "Instructor" FieldLabel, "athletes, boosters", `club-admin`, `/admin/club/*` in sveltekit.md (now `/admin/team/*`), and the instructor wording in restrict-admin-access.

### Class 1: consumer-site identity
| file:line | quote | verdict | replacement |
|---|---|---|---|
| tool/cmd/cairn/messages.go:83,268,346,355,506 | `cairn health ecxc-ski-a1b2c3`, `cairn adopt --worker ecxc-ski` | **leak** (ships in the binary's help) | `my-site-a1b2c3`, `--worker my-site` |
| packages/create-cairn-site/template/wrangler.jsonc:3, templates/waymark/wrangler.jsonc:3 | "Modeled on the live 907-life cairn site." | **leak** (copied into every site) | delete the clause |
| skills/cairn-consult/references/the-standard.md:18 (+ template/.claude and waymark/.claude copies) | "takes ASC's ratified grammar" | **leak** | "takes one site's measured grammar" |
| skills/cairn-admin-screens/references/exemplar-list.md, exemplar-detail.md (+ 2 copies each) | whole files: `eyebrow="Club" title="Members"`, "Add household", `/admin/club/members/<id>`, cards "Roster, Memberships, Money timeline, Assets" | **leak** (ASC's member-management screens) | rebase both exemplars on the scaffold's own `/admin/signups` screen, which the reader can open |
| src/lib/reproductions/fixtures.ts:50,273-276, stories/CustomScreen.svelte:22 | `'Trailhead Club'`, a "Club" section with Events/Members, `eyebrow="Club"` | **leak** (shows in rendered docs figures) | section "Community" or "Programs"; site name "Trailhead"; the trail content itself is fine |
| src/lib/sveltekit/admin-action.ts:177, section-action.ts:153 (TSDoc `@example`) | `// src/routes/admin/club/events/[id]/...` | **leak** (shows in IDE hover) | `/admin/team/events/[id]`, matching the reference's new paths |
| src/lib/admin/CairnAdminShell.svelte:525, audit/rules/rendered/screen-anatomy.ts:47 | "a section entry like /admin/club/events" | minor (internal comment) | `/admin/team/events` |
| docs/extend/migration-notes.md:579-601 | upgrade order `ecxc-ski`, `907-life`, `xcathletes-org`, `aksailingclub-org`, plus `src/admin-club/lib/announcements.ts` | **leak** (shipped page, no use to a public reader) | "a site that composes `OfficeList` updates every importing route", with the per-site list moved to HISTORY |
| docs/extend/migration-notes.md:506 | `<PageHeader eyebrow="Club" title="Events">` | **leak** (copyable sample) | `eyebrow="Team"` |
| docs/reference/reproductions.md:6,36,43,53,140; src/lib/reproductions/*.ts (~8) | "notably cairn-pub", "cairn-pub's fence validation" | mild (uses the repo name) | "cairn.pub, cairn's docs site" |
| README.md:61-62 | "runs in production on two sites today, ecxc.ski and 907.life" | fine if deliberate social proof; you decide | allowlist it with a recorded reason |
| docs/reference/*.md and schema `$id`s: `https://cairn.pub/...` | the docs host | fine | none |
| outlines/extend.json:1582,1591; scripts/checks/check-symbols-allowlist.mjs:180,183 | `src/lib/club/section.ts`, `src/admin-club/lib/announcements.ts` | leak (agent input, keeps club paths alive) | prune when the page no longer cites them |
| facts/front-door.md:68-95 | ecxc/907 production claim, App ids, D1 database names | see class 4 | none |

**Where it entered:**
- **CLI help:** the Go examples were written against the maintainer's real site ids.
- **Template comments:** provenance comments survived the chassis harvest and sync to all three copies.
- **Skill exemplars:** transcribed from ASC's production screens (their own header says "a consumer site's").
- **The `navLayout` worked example:** CHANGELOG ~6028-6058 says it shipped with "production club-admin section as its worked example". From there it spread to the reproduction fixtures, the TSDoc `@example`s, then the reference pages.

### Class 2: domain vocabulary
| file:line | quote | verdict | replacement |
|---|---|---|---|
| docs/reference/admin-toolkit.md:93-94,311-312,333,410-454,549,552,836-856 | `"0 households"`, `itemLabel={{ one: 'household', ... }}`, `"12 households · Overdue · Holding assets"`, `<th>Household</th>`, "Expand the … household" | **leak** (ASC membership model) | `signup`/`signups` or `contact`/`contacts`; standings such as Pending, Confirmed, Waitlisted |
| src/lib/admin-toolkit/format.ts:115-131, list-toolbar.ts:98-104, ListToolbar.svelte:144, ExpandableRow.svelte:97 ("Expand the Alvarez household"), StatusChip.svelte:20,41 ("household-standing") | same vocabulary in TSDoc | **leak** (source of the reference examples) | same |
| src/lib/admin-toolkit/FieldLabel.svelte:21 | "Instructor Add" | leak | "Venue Add" (the reference now uses Venue) |
| skills/cairn-admin-screens/references/form-anatomy.md:77 (+2 copies) | "Instructor notes" | leak | "Internal notes" |
| docs/internal/engine-rulings.md:1401,1404 | any-site case: "a club with instructors, a team with coaches" | upstream source of the roles examples | "a staff area, a volunteer team" |
| Waymark seed content (`the-trail-crew.md`, season notes, trail notes); docs/extend/scaffolded-site-files.md:431 | describes the real seed files | **fine** | none |
| README.md:24-29; register "member signups, reservations, rosters…" | generic small-organization list | fine | none |
| sveltekit.md:1872 `db.assetRequests` "pending requests" | borderline (ASC equipment loans), reads generic | fine | none |
| Excluded as generic or noise: class(es), member(s), roster (cairn's editor roster), team (Zero Trust team), race (race condition), trail/season (Waymark brand) | | fine | none |

**Where it entered:** the admin-toolkit components moved into the engine from aksailingclub-org's own toolkit (CHANGELOG ~5267-5328: "graduating the fix aksailingclub-org's own toolkit proved for the '1 households' defect"). They brought ASC's TSDoc examples with them. Those became the reference examples, and the skill exemplars came straight from ASC. The roles examples came from the engine-rulings any-site case, then a fact, then a plan, then the page.

### Class 3: maintainer process
| file:line | quote | verdict | replacement |
|---|---|---|---|
| docs/reference/admin-toolkit.md:214 | "the 2026-08-24 owner probe, Geoff's own ratification: `docs/internal/probes/...`" | **leak** | "second generation; no `tone` prop" (drop the provenance) |
| examples/showcase/src/chassis/README.md:16,241 and composition.css:3, each with a template copy and a waymark copy (9 lines) | "(Geoff, 2026-07-05)", "the 'generous, not minimal' ruling" | **leak** (shipped to every site) | drop the parenthetical; "the chassis is deliberately generous" |
| skills/cairn-consult/references/the-standard.md:25 (+2 copies) | "a standing goal Geoff named at the sitting" | **leak** | "cairn's standing goal" |
| skills/cairn-consult/references/brief-template.md:11, SKILL.md:21; docs/reference/guidance.md:130 | "What the pass builds" | leak (house jargon) | "What the site is building" |
| skills/cairn-consult/references/brief-template.md:4 | `docs/internal/consultations/...` | fine-ish (it names the engine repo's filing location) | none |
| README.md:14 | link to `./docs/internal/src-lib-map.md` | **leak** (dead on npm and cairn.pub) | an absolute GitHub URL, or drop it |
| admin-grammar-tokens.md:110; admin-toolkit.md:709,749; render.md:64; cairn-audit.md:91,241,615 | links and paths into `docs/internal/admin-design-system.md` | **leak** (`docs/internal` is not in `files`, so these break in the tarball) | absolute GitHub URLs, or move the needed facts into the reference |
| public-css.md:120 | link to `../superpowers/research/...theme-pass-c-ink-derivation.md` | **leak** | inline the result, or an absolute URL |
| sveltekit.md:1146 | `[ROADMAP.md](../../ROADMAP.md)` | leak (not shipped) | absolute URL |
| cairn-audit.md:567-569 | "(exempt: RULING 2 (2026-07-28) … ratified hairline" | mild | "(exempt: the documented hairline)" |
| "ratified" in admin-toolkit (3), admin-grammar-tokens (2), sveltekit (1), skills | "ratified chip recipes" | mild jargon | "the documented recipes"; cairn-audit's `ratified` provenance value is product vocabulary and fine |
| skills/cairn-extend/SKILL.md:12,23-26 | `docs/internal/*` paths, with a stated pointer to the GitHub repo | fine (disclosed) | none |
| "the owner" in security-model, auth-store, guidance and others | cairn's owner role | fine | none |
| briefs/*.plan.md: "Owner rulings (Geoff, …)", `/var/home/glw907/.local/share/cairn/exemplars/...` | agent inputs | fine for provenance; the workstation paths aren't portable | none |

**Where it entered:** chassis and skill text written inside the maintainer loop, with rulings attributed inline, then synced to the template copies. The reference links into `docs/internal` pass `check:docs` because that check only tests that the target exists in the repo.

### Class 4: personal data
| file:line | quote | verdict | replacement |
|---|---|---|---|
| docs/internal/facts/front-door.md:89-95 | GitHub App id `3847496`, installation `135372268`, D1 UUIDs for `cairn-ecxc-auth` and `cairn-907-auth`, `~/.dotfiles/secrets/values.age` | **leak** (the repo is PUBLIC; a drafter can cite these) | mark them excluded, or move them to `credentials.md` only |
| facts/front-door.md:88, extend.md:130,225 | "observed on `glw907/907-life` commit … author Geoff Wright" | leak (agent input) | "observed on a production publish commit" |
| docs/reference/auth-store.md:31,112-113 | `Backup@Site.com` | fine (placeholder) | `example.com` keeps the email allowlist simple |
| templates/waymark/LICENSE:3 | "Copyright (c) 2026 Geoff Wright" | fine (legal) | none |
| `github.com/glw907/cairn-cms` links | the project's own repo | fine | none |

### Class 5: assumed tools
Nothing new. Remaining hits:
- `docs/extend/scaffolded-site-files.md:89,130,143-180` labels Claude Code's files in one line each, as ruled.
- `docs/reference/guidance.md` documents the Claude Code guidance pack and states it ships no `AGENTS.md`. Fine.
- "a script or an agent" (`debug-your-site.md:65`) and "an agent or a developer" (`cairn-audit.md:590`) are both generic. Fine.

### Proposed check: `check:leaks` (`scripts/checks/check-leaks.mjs`, plus `leak-terms.json`, added to docs-gate.mjs's step list)

**Tiers (each finding is an error unless marked):**
- **T1, published:** `README.md`, `docs/{extend,reference,admin,editors}/**/*.md`, `docs/why-cairn.md`, `docs/README.md`, `examples/showcase/README.md`. Classes 1–4.
- **T2, shipped:** `skills/**`, `claude/**`, `examples/showcase/src/chassis/**`, `src/lib/reproductions/**`, `tool/cmd/cairn/messages.go`, and the TSDoc blocks (`/** … */`) in `src/lib/**/*.{ts,svelte}`.
  - TSDoc is scanned for classes 1–2 only. Ordinary `//` maintainer comments are not scanned.
  - Scan `packages/create-cairn-site/template/**` and `templates/waymark/**`, but skip `src/content/**`, `.cairn/index.json`, `LICENSE`, and the synced `.claude/**` copies (`skills/` is the source; add a sync-equality check if one doesn't already exist).
  - `CHANGELOG.md`: error under `## Unreleased`, warning in released sections.
- **T3, agent inputs:** `docs/internal/briefs/**`, `docs/internal/outlines/**`, `docs/internal/facts/**`, `docs/internal/docs-register.md`. Classes 1, 2 and 4 only; process vocabulary is expected there.

**Patterns:**
- **C1, identity:** `\b(ecxc|907[.-]life|aksailing[\w-]*|alaska sailing|xcathlet[\w-]*|cairn-pub)\b`, case-insensitive. `\bASC\b`, case-sensitive. In T1 and T2 also `\bGeoff\b` and `glw907/(?!cairn-cms\b)`. URLs under `cairn.pub/` pass, because only the `cairn-pub` slug matches.
- **C2, domain:** `\b(clubs?|club-admin|instructors?|dues|households?|athletes?|boosters?|coach(es)?|regattas?|moorings?|sailing|skiing|skiers?|racers?|waxing|anchorage)\b`, case-insensitive. Deliberately left out: class(es), member, roster, team, race, trail, season, event.
- **C3, process (T1 and T2 only):**
  - `\bGeoff\b`, `\b(owner|house) ruling\b`, `\b(Geoff|owner)\b[^)\n]{0,20}20\d\d-\d\d-\d\d`, `\bf:[a-z0-9]{6}\b`, `facts container`, `\bconductor\b`, `\bstage 2[ab]\b`.
  - Link or path targets: `(\.\./|docs/)(internal|superpowers)/`, `\b(ROADMAP|STATUS|HISTORY)\.md\b`, `/var/home/|~/\.dotfiles|~/Projects`.
  - Warning only: `\bratif(y|ied|ication)\b` outside backticks.
- **C4, personal data:**
  - Emails, except `example.(com|org|net)`, `*.test`, `*.invalid`, `*.example`, `noreply@`, `site.com` (or migrate that one).
  - UUIDs, except all-zero ones.
  - A list of known account ids kept in the check's own config.

**Allowlist:**
- Next-line marker, mirroring the existing `cairn-audit-disable-next-line` idiom: `<!-- leak-ok: C1 -- reason -->` in markdown, `// leak-ok: C2 -- reason` in code. The reason is mandatory.
- Region form: `<!-- leak-ok-begin: C1,C2 -- reason -->` … `<!-- leak-ok-end -->`.
- Path exceptions only for seed content and LICENSE.
- No whole-file exemption for `migration-notes.md` or `upgrade-cairn.md`. Wrap their existing historical blocks in regions so new entries stay checked.

**Expected hits on the current tree (after the other agent's edits land):**
- T1: C1 about 23, C2 about 38, C3 about 13. These are almost all real; the C2 hits are mostly admin-toolkit households.
- T2: C1 about 55, C2 about 127. These are mostly the CHANGELOG (warning), the three copies of each exemplar, and the chassis "Geoff" lines.
- T3: C1 about 19, C2 6, C4 5.
- Genuine false positives (allowlist them): the register's own examples-rule paragraph, which quotes "classes and club members" and "ASC"; README:61-62 if you keep that line; migration-notes history blocks if you keep them; the LICENSE.
- No SQL `ASC` and no `.club` matches appear in the scanned files.
- The `check-symbols-allowlist` club paths sit in `scripts/` and are not scanned. They clear once the outline entries are pruned.

### Outside cairn-cms (`~/.dotfiles/claude/.claude/`)
- `agents/cairn-docs-drafter.md:124-133` and `agents/cairn-register-editor.md:125-128` already carry today's examples rule. Both quote the leaked phrase word for word, which is fine as provenance.
- `skills/engine-consult/SKILL.md:91` and `agents/engine-triage.md:53` contain "ASC's ratified grammar". That is maintainer-side and fine, but it is the upstream text the shipped `skills/cairn-consult/references/the-standard.md` was copied from. Fix the shipped copy, and consider making engine-consult's wording site-neutral so a future copy doesn't carry it back.
- `skills/{site-pass,cairn-figure,engine-consult}`, `workflows/pass-execute*.js` (the `CAIRN_FAMILY` regex) and `docs/web-content-method.md` name the sites in site-pass contexts. Fine.
- No dotfiles workflow bakes a domain example into what the drafter receives. The leak came from cairn-cms's own engine history: the ASC-graduated toolkit, the `navLayout` worked example, and the any-site audit case.
## Appendix: the shared replacement vocabulary

Owner rulings: "If this relates to the ASC's site, an implementer will have ZERO context." "Examples should be generic and likely to apply to many organizations." "We need to fix this leak in the infra and remove all occurrences." "And look for any other similar leaks."
- household / households -> signup / signups ("0 households" -> "0 signups"; itemLabel { one: 'signup', other: 'signups' }; <th>Household</th> -> <th>Name</th>; "Expand the Alvarez household" -> "Expand the Alvarez signup")
- standings Current / Former / Overdue / Holding assets -> Pending / Confirmed / Waitlisted ("household-standing" -> "signup-status"; drop "Holding assets")
- "Club" nav section, eyebrow="Club" -> "Team"; /admin/club/... -> /admin/team/...; #lib/club/ and src/lib/club/ -> #lib/team/ and src/lib/team/; CLUB_DB -> TEAM_DB
- "Trailhead Club" -> "Trailhead" (trail content itself stays)
- "Instructor" field label -> "Venue"; "Instructor notes" -> "Internal notes"
- role examples: staff (capability none, home /admin/staff); webmaster (editor)
- ecxc-ski / ecxc-ski-a1b2c3 in examples -> my-site / my-site-a1b2c3
- "ASC's ratified grammar" -> "one site's measured grammar"
- inline maintainer provenance in shipped/published text ("(Geoff, 2026-07-05)", "Geoff's own ratification", "a standing goal Geoff named at the sitting", "RULING 2 (2026-07-28)") -> drop the provenance, keep the rule
- "What the pass builds" -> "What the site is building"; "ratified" (prose) -> "documented"
- "cairn-pub" (repo slug in prose) -> "cairn.pub, cairn's docs site"
- Left alone: README.md:61-62 production-sites line (owner decision pending); LICENSE copyright; Waymark seed content; class(es)/member/roster/team/race/trail/season/event; github.com/glw907/cairn-cms links; cairn.pub URLs.
