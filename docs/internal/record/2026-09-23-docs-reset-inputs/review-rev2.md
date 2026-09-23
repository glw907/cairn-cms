# Review: docs reset spec, revision 2

Reviewer: Opus 5.5, cold, read-only. Cited as `spec:N` (revision 2 at `d7f64f7a`).

## 1. Disposition of revision 1 findings

**Repo reality.** C1 resolved (`spec:52-58`, `117-122`), with new leaks below. C2 resolved
(`spec:59-61`), but see N2. C3 partly: harvest added (`spec:192-193`); trial jobs, page paths,
contracts, and done signals still come from 2b (`spec:207-219`). M1 partly: ceilings raised
(`spec:276-278`), trial still underfunded (N4). M2 resolved (`spec:88-93`). M3 resolved
(`spec:224-227`). M4 resolved (`spec:141-143`), except that `site-pass` and `cairn-pass` are
skills, not "agent definitions". M5 partly: the grader comparison is fixed (`spec:198-201`); the
omission checklist and Vale/`tellgrader` feed (`spec:70-71`) reach no component. M6 resolved
(`spec:100-110`). M7 resolved (2a/2b). Minors: all resolved (`spec:156-157`, `163-165`,
`189-190`, `198`, `261-263`, `47-48`).

**Methodologies.** F1 resolved (`spec:134-140`). F2 partly: three runs and a tie read as no
evidence (`spec:197-201`); there is no clustered SE, and the medium/high arm is not marked
exploratory. F3 partly: there is a labeled set, but no adjudicator for disagreements. F4 resolved
(`spec:62`, `211-213`, `217-220`). F5 partly: Doc Detective yes (`spec:163`); the
`skill-creator` eval layout is unaddressed. F6 resolved (`spec:188-190`). F7 resolved
(`spec:231-232`). F8 partly: the fold runs in the trial only (`spec:202-203`), with no per-pass
close fold and no system kill criterion beyond `spec:169`. F9 partly: delivery yes (`spec:233`),
no production signal. F10 ignored with no reason given.

**Prior art.** C1 resolved (`spec:144-146`). C2 resolved (`spec:147-148`). M1 partly: it is
conditional on "the baseline shows line-window rot" (`spec:149`), but no baseline job measures
pointer rot. M2 resolved (`spec:76-77`). M3 partly: the fold runs in 2a only. M4 resolved
(`spec:207`). M5 resolved (minimal arm, `spec:195`). m1 resolved (`spec:181-183`). m2 resolved
(`spec:246`). m3 is stated in Evidence only. m4 and m5 resolved.

**Twelve planner guesses.** 1 resolved (table). 2 partly: which pages carry planted defects is
unnamed. 3 partly: see N5. 4 partly: model and verdict are named; the schema and the on-failure
action are not. 5 resolved. 6 resolved. 7 partly: "two" appears in Evidence (`spec:83`), not in
item 6. 8 partly: see N6. 9 partly: branch only. 10 partly: `README.md`, `CONTRIBUTING.md`,
`claude/`, and `skills/` are unstated. 11 resolved (`spec:114-115`). 12 resolved (`spec:102`).

## 2. New problems

### Critical

**N1. The confinement holds only for the file tools. The designer, extender, and core-developer
classes execute code.** `--restricted` "confines the file tools to the working directories"
(`claude --help`). It does not confine processes that Bash starts. The probe tested `Read` and
`cat`. A designer or extender job (`spec:129`) needs Write plus `npm run build/dev`. A reader
that writes `fs.readFileSync('/var/home/.../cairn-cms/...')` into a `+page.server.ts` or a Vite
config and then builds reads anything. The Repository class (`spec:130`) runs npm scripts the
same way. The same class also has a content leak. The tarball ships `docs/admin`, `docs/editors`,
`docs/extend`, `docs/reference`, `claude`, and `skills` (`package.json:190-203`), so a reader
testing a new or planted draft finds the old, unplanted copy under `node_modules/@glw907/cairn-cms/docs/`.
Compiled `dist` is readable engine code, which contradicts "never engine source". **Fix:** run the
code-executing classes in an OS sandbox (bwrap or podman, with only the reader directory mounted)
or record the leak as accepted. Strip `docs/`, `claude/`, and `skills/` from the installed package,
or substitute the drafts. Extend item 1's acceptance to a build step that tries to read an
outside path.

### Major

**N2. The operator reader reaches production and the owner's keyring.** `cairn` reads tokens from
the environment or the OS keyring (`tool/internal/providers/cred.go:17`), and its registry from
`CAIRN_STATE_DIR` or the user config directory (`tool/internal/store/paths.go:43`). With
`Bash(cairn *)` and the inherited environment and D-Bus session, a reader can run
`cairn auth unset`/`set` against the owner's keyring, `cairn sites list` over the real registry,
`cairn logs <site>` over production logs that carry editor emails, and `cairn doctor <any dir>`
(`doctor.go:24`) on a real checkout. The only read tokens that exist cover all zones and the four
production repos plus cairn-cms (`~/.dotfiles/secrets/registry.md:269-283`). No scratch-site
token exists, and the GitHub token expires 2026-10-19. "State-changing checked as dry run"
(`spec:60`) has no enforcement. **Fix:** allowlist only read-only subcommand patterns. Launch
with `env -i`, plus `HOME`, `PATH`, the scratch tokens, and `CAIRN_STATE_DIR` set to the reader
directory, with no `DBUS_SESSION_BUS_ADDRESS`. Schedule the scratch site and the token mint (a
GitHub PAT needs Geoff) as a pass 1 prerequisite with attended time counted.

**N3. The chain cannot call the runner as specified.** `docs-page-chain.js` can only call
`agent()` (`:220-244`). A headless reader must be started by an intermediary agent's Bash, whose
timeout caps at 10 minutes, too short for a real operator job. **Fix:** state the invocation path
(an intermediary agent with a backgrounded runner, or a runner outside the Workflow) and its
timeout handling.

**N4. The trial budget contradicts its own rebasing.** Eight to ten jobs × three drafts (minimal,
full at `high`, full at `medium`) comes to 24-30 drafts and at least 72-90 reader runs, plus the
grader comparison (`spec:194-199`). At the stated 900K per full-chain page, the 16-20 full drafts
alone exceed 14M against "about 5M" (`spec:277-278`). **Fix:** cut to about three jobs for the
effort arm, or re-derive the number and the 2a ceiling.

**N5. A content-derived id breaks the drift plan.** An edited bullet gets a new id, so every
citing brief dangles, and the reverse mode (`spec:147-148`, `231`) cannot name the "changed"
bullet. Identical claims collide. **Fix:** mint an opaque id once at filing, for example a random
base32 string, and keep it stable across edits.

**N6. The provenance design assumes a ledger that does not exist.** Spec `2026-09-08:572-580`
resolves ids to a "ledger" with an `owner` tier and an extractor. The facts container has
neither, and there is no `check:ledger` or `check:provenance` in `package.json`. The committed
briefs have no path. **Fix:** name the id-to-container mapping, whether the `owner`-tier
extraction is built, and the brief directory.

**N7. Evidence contradicts item 6.** "A grader is kept for register and tone, fed Vale and
`tellgrader`, with an omission checklist" (`spec:70-71`). Item 6 removes the grader and builds no
checklist. **Fix:** assign both to item 6, or strike them from Evidence.

### Minor

- **The pass A page count.** Pass A had three contract pages, not two (`spec:29`, `137`; plan
  `:352`, commit `cca525b5`). One of its 15 findings was the parser's own error (plan `:470`), so
  the labeled set is 14. Name the pre-fix SHAs (`3bfaac37`, `3453668f`, `29a03eff`).
- **The candidate count.** 179 bullets are candidates, and 134 of them are sourced only to a page
  (`check:facts`). The spec also says nothing on `external` (33), `vendor` (7), and `docs-drift`
  (3) against "only verified facts survive".
- **Two exempt items read as droppable.** `spec:139-140` lets the baseline drop any component,
  yet items 1, 2, 4, and 8 are prerequisites. List them as exempt.
- **The baseline wording.** "Through today's chain" (`spec:135-136`) could mean a redraft or a
  read of today's pages. Pick one.
- **The site round.** Its evidence feeding pass 1 (`spec:103-104`) may not exist yet. Say "when
  available".
- **The binary version.** The pages document `cairn` 1.1.0 (`version.Documented`), but the tag
  is still pending (STATUS:28). Pin the reader's binary to the documented version.
- **Docs-as-tests in CI.** It needs tokens stored as Actions secrets (`spec:231`), a new secret
  flow the spec does not name.
- **The pinned-path gate.** 2b builds a gate script (`spec:224`), but its plan names no
  implementer chain.

## 3. Ruling 9 against `claude --help` (2.1.280)

All four flags exist as described. `--permission-prompts none` applies only with `-p`, which
matches. Residual gaps:

- **Plugins.** `--safe-mode` keeps "built-in tools and plugins", so "every plugin" (`spec:56`)
  overstates it.
- **Web tools.** `--restricted` removes WebFetch but does not mention WebSearch. An explicit
  `--tools` list excludes both, but the spec never bars web tools. cairn is public on npm, GitHub,
  and cairn.pub, so one web call reaches the source and the current docs. State "no web tools in
  any class".
- **MCP.** Add `--strict-mcp-config` as the help advises. Assert the tool, MCP, and memory set
  from the `--output-format stream-json` init event in the runner, and fail on any surprise.
- **Auto-memory.** `--safe-mode` does not name it; only `--bare` does. Use a fresh unique
  directory per run so no memory accrues.
- **`--add-dir`.** Never pass it, since it widens the confinement.
- **Environment.** The environment is inherited (N2).

## 4. Remaining plannability guesses

1. The job statements and profile or arrival text the baseline readers receive before any
   profile exists.
2. The planted-defect pages and the count per class.
3. The Bash and Write allowances per class beyond the operator.
4. The applied-findings schema and what happens on "not applied".
5. The id format, the brief path, and the provenance ledger mapping (N5, N6).
6. The trial's job selection and contracts, and who writes them in 2a.
7. The scratch site's identity, and who provisions it.
8. What "catches defects the minimal chain misses" measures across different drafts: residual
   reader-found defects per final draft, or something else.
