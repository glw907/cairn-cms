# Verification — walk-newcomer internals findings (fresh context, 2026-08-26)

Verifier did not produce these findings. Each tested in both directions against the code and
against the in-repo rulings (`docs/internal/code-idioms.md`, `docs/internal/engine-rulings.md`,
`docs/internal/README.md`, `docs/internal/docs-register.md`, `CONTRIBUTING.md`).

---

## NW-01 — no internals map for `src/lib` — **STANDS** (tier: refactor, unchanged)

Confirmed against the tree, not the prose:

- `ls src/lib/*.md` → nothing. No `src/lib/README.md`.
- `docs/internal/` holds 20 top-level docs; none is an engine/module map. `grep -rli "engine-map|internals map|module map" docs/ CONTRIBUTING.md` hits only
  `docs/superpowers/plans/2026-08-26-engine-consultation-pass.md` (a plan, not a map).
- `CONTRIBUTING.md:128-130` is exactly the three lines quoted. Verbatim: "`src/lib/`: the shipped
  library. Public entry points are package subpaths, each with a matching page in
  `docs/reference/`; a directory without a reference page is internal."
- `docs/extend/architecture.md` is 141 lines with six headings. `grep -nE "content/|github/|auth/|log/|diagnostics/|nav/|audit/"` over it returns **zero hits**: it names no internal
  directory or module anywhere. Its diagram caption states its own scope ("The engine boxes group
  the package's export subpaths by function"). Its "What stays engine-internal" section names
  internals only as concepts ("the directive-stamping and dispatch machinery", "the guard's
  internal CSRF and session resolution"), then routes the reader to reference pages. It is doing
  its job for its audience; it is simply not the artifact this finding asks for.
- `docs/internal/api-surface.md` is the only other candidate and is a GENERATED flat dump of
  export type shapes ("GENERATED — run `npm run check:surface -- --update`"), not a module map.

Scale claims measured (`find src/lib`):

| claim | finding | measured |
|---|---|---|
| directories | 23 | **23** |
| `.ts` files | 274 | **274** |
| `components/` files | 92 | 82 files (56 `.svelte` repo-wide) — slight overstatement |
| `audit/` LOC | 8857 | **10,333** (all files); understated, not overstated |
| `sveltekit/` LOC | 9650 | **9,650** exact |
| total | ~60k | **63,917** (`.ts` + `.svelte`) |

One number is soft (`components/` file count) and one sentence in the evidence is garbled
("audit/ alone is 8857 LOC, larger than sveltekit/ at 9650 is comparable"), but every load-bearing
claim is true and the magnitudes are, if anything, conservative.

**Counter-case tested and rejected.** No ruling anywhere sanctions the absence. The opposite:
`docs/internal/README.md`'s filing rule reserves the top level for living standards, so an engine
map has an obvious home, and CLAUDE.md's own "How to run this project" section routes a new reader
to a spec, not to the code. Against the stated bar ("inviting and comprehensible to a new
developer", "easy for an AI agent to extend"), the gap is real and is upstream of the rest of the
walk.

---

## NW-02 — public vs internal directories indistinguishable — **STANDS, DOWNGRADE to `note`**

The factual half checks out; the diagnosis and the remediation both run into a standing ruling.

**What is true.** `package.json` `exports` carries 16 keys with a `types` field; 13 are backed by
a same-named `src/lib` directory. Ten more directories (`audit`, `auth`, `content`, `design`,
`diagnostics`, `doctor`, `github`, `log`, `media-seed`, `nav`) are internal. They do interleave
alphabetically. `src/lib/auth-crypto/index.ts` is one `export {...} from '../auth/crypto.js'`
line; `auth-store/index.ts` re-exports seven functions plus `EditorRow`; `auth/` is 841 lines of
implementation; `auth-channel/` is 1,548 lines of real subsystem. All four sizes verified.

**What the finding misses — `code-idioms.md` M2, verbatim:** "Barrels exist only at public subpath
entries and stay **re-export-only**." The two directories the finding calls "shim directories" and
proposes to retire are the charter's *one obvious way*, and the third clause of that same rule
("`doctor/index.ts` moves its resident logic out to honor this") has landed — `doctor/index.ts` is
now 8 lines and its header says "it carries no logic of its own." The finding pattern-matches a
thin-file lint instinct against a rule that deliberately produces thin files.

**The proposed retirement would destroy real information.** Both barrels carry long headers that
are the curation contract, not filler. `auth-crypto/index.ts` names what stays *out* and why: "the
TTL constants and `SEND_COOLDOWN_MS` (a TTL is a site's own ruling), the engine's own cookie-name
functions (they are internal ...)". `auth-store/index.ts` likewise: "the auth-flow functions
(`findEditor`, `issueToken`, session handling ...) stay unexported here." The public barrel exports
a deliberate *subset* of `../auth/crypto.ts` and `../auth/store.ts`. Moving those source files into
the public directories, as the remediation proposes, collapses the subset into the whole file and
deletes the distinction the headers exist to hold.

**The tree-signal complaint also has a counterweight.** Public directory name == import specifier
tail, 1:1 (`src/lib/auth-channel` → `@glw907/cairn-cms/auth-channel`). That correspondence is a
comprehension asset a `src/lib/public/<subpath>/` nesting would break. And `package.json`
`exports` is the canonical, machine-read declaration every JS developer already looks at;
`check-surface.mjs` derives its subpath list straight from it ("drawn directly from package.json
`exports`"), so a new directory cannot silently join the public side.

**Residual, which is why it does not drop.** Opening the barrel answers the question in one line,
but `ls src/lib` alone does not, and the four-way `auth` / `auth-crypto` / `auth-store` /
`auth-channel` adjacency is the one place a cold reader plausibly mis-guesses. That residual is
exactly one labeled column in NW-01's map — a sub-item of NW-01, not an independent restructure.
Hence `note`, and the structural half of the remediation should not be executed.

---

## NW-03 — internal process references in shipped source comments — **STANDS** (tier: refactor, unchanged)

Counts re-measured independently:

- `grep -rEo "Plan [0-9]+" src/lib | wc -l` → **17** (finding: 17).
- `grep -rEo "C2 breaking-window pass|export-rule sweep|R[0-9] ruling|Pass [A-Z]|spec [0-9]\.[0-9]|Task [0-9]+|phase-3a|2a fetch" src/lib | wc -l` → **192** occurrences (finding: 189; the
  small gap is pattern punctuation, not a different phenomenon).
- `grep -rEo "docs/superpowers/[^ )\`]*" src/lib | wc -l` → **19**, and `package.json` `files` is
  `["dist","migrations","skills","CHANGELOG.md","docs/README.md","docs/why-cairn.md","docs/reference","docs/admin","docs/editors","docs/extend"]` — `docs/superpowers/` is confirmed
  unshipped. Every one of those 19 pointers is dead for anyone who installed the package.
- Consumer-site names: **18** hits, matching.

Every quoted line verified in place (`src/lib/index.ts:5-6` and `:38-39`,
`sveltekit/cairn-admin.ts:275/:316/:323`, `sveltekit/admin-action.ts:1-10`).

**Two parts of the finding are overstated and should not drive the remediation.**

1. "Each reference sits exactly where a rationale is promised, so the comment reads as an answer
   while resolving to nothing" — not generally true. Most cited sites state the reason first and
   append the pass as a provenance tag: `index.ts:38` reads "`ConceptConfig.datePrefix` and
   `ConceptDescriptor.routing` name these (export-rule sweep, C2 breaking-window pass, R4
   ruling)"; `cairn-admin.ts:275` reads "The tidy settings save (spec 2.8, Task 15): the editor
   commits the per-convention block to the committed YAML. Gated to the settings view..." The
   defect is dead-weight citation, not a missing rationale. The genuinely opaque cases are the
   bare ones — `":316"`'s "The preview pair are **2a fetch actions**" and `":323"`'s "**Pass C**
   library actions" — plus `index.ts:5-6`'s three-plan history, which carries no engineering
   content at all. That narrows the sweep: strip the tag, keep the sentence.
2. "against the docs-register rule that never names ASC publicly" — **misapplied.**
   `docs/internal/docs-register.md:356` reads "Name types of functionality, never a specific
   consumer site," and it sits inside the *front-door register* section, governing the
   extensibility-claim examples on a published docs page. It is a docs-prose rule, not a source-
   comment rule, and it exists to stop a pitch, not to stop attribution. In `src/lib` the 18 hits
   are overwhelmingly provenance ("graduated from aksailingclub-org's
   `src/admin-club/toolkit/StatusChip.svelte`"), which is honest attribution. The real cost is
   narrower and still real: the referenced repo is private, so the pointer is unreachable for an
   MIT consumer, and two of the 18 leak operational incident detail (`email.ts:94` "the ecxc
   fault", `cairn-admin.ts:184` "original ecxc save 500"). Rewrite for reachability, not for a
   naming prohibition that does not exist.

The proposed `check:comments` rule is the right shape and the repo already has the hook for it
(`check:comments` → `scripts/checks/check-comments.sh`), which is what keeps this at `refactor`
rather than `note`: the deliverable is a sweep plus a gate, not a note.

---

## NW-04 — `code-idioms.md` written as a completed pass's to-do list — **STANDS, strongly** (tier: refactor, unchanged)

The strongest of the four. Every element verified, and the "did it land" spot-check goes further
than the finding did.

**The doc is declared a living standard.** CLAUDE.md names it the idiom charter; `docs/internal/README.md` lists it under "Live" as "the agent-facing idiom charter, one obvious
way per pattern; a standing pass dimension"; the filing rule in that same README says "A living
standard stays top-level." Its own header says "This is a standing pass dimension." So the
future-tense residue is drift, not a deliberate archival voice — there is no ruling to shelter it.

**The tense claim.** Verified verbatim: M1 "The stragglers (`pending.ts`, `fields.ts`, `env.ts`,
two auth files) converge"; M2 "`doctor/index.ts` moves its resident logic out to honor this"; M3
"are retired by retargeting their importers"; M4 "the tab-indented `doctor/` tree and its test
cluster converge"; A2 "becomes **one shared helper**"; N1 "internal bare-noun stragglers converge
(fix `altIsEdited`)"; S3 "extract to one home each"; T1 "gets **one shared harness**"; T2 "hoist
them where unit tests can import them". Plus two closing sections of pure process residue,
"Structural decisions (this pass)" and "Sweep clusters (Task 4 partition, riskiest first)" with
eight numbered work packages naming a gate cadence.

**Landing status, spot-checked (this is the damning part — 8 of 9 landed, 1 silently did not, and
the doc reads identically for both):**

| rule | states | actual |
|---|---|---|
| M1 headers | pending | **LANDED** — `pending.ts`, `fields.ts`, `env.ts`, `auth/crypto.ts`, `auth/store.ts` all open `// cairn-cms:` |
| M2 doctor barrel | pending | **LANDED** — `doctor/index.ts` is 8 lines, re-export only |
| M3 permalink shim | pending | **LANDED** — `src/lib/content/permalink.ts` does not exist |
| A2 shared helper | pending | **LANDED** — `content/cross-branch-index.ts`, imported by `advisories.ts`, `reference-index.ts`, `tag-usage-index.ts`, `media/usage.ts` |
| N1 `altIsEdited` | pending | **LANDED** — 0 hits in `src/lib` |
| S3 extractions | pending | **LANDED** — `segmented-control.ts`, `typed-confirm.ts`, `client-action.ts` all exist |
| T1 harness | pending | **LANDED** — `src/tests/unit/_content-harness.ts` exists |
| T5 `getByTestId` retires | present tense | **NOT HELD** — 3 files in `src/tests/component` still use it |
| **M4 2-space** | pending | **NOT HELD** — see below |

**M4 in detail.** `grep -rlP '^\t' src/lib` returns exactly the 8 files the finding names:
`components/{chrome-guard,editor-tidy,tidy-categorize,tidy-diff,tidy-validate}.ts`,
`diagnostics/{conditions,error}.ts`, `sveltekit/tidy-prompt.ts`. These are real indentation, not
tabs inside template literals — `conditions.ts` has 200 tab-led lines, `tidy-diff.ts` 130,
`chrome-guard.ts` 30, including TSDoc block bodies. `.editorconfig` exists and its header claims
it "records the code-idiom charter's M4 rule ... so an editor enforces it going forward instead of
relying on a one-time sweep to hold." `.editorconfig` is advisory only: `grep -n "indent|editorconfig" eslint.config.js package.json` returns **nothing**. So the mechanism installed
specifically to make the sweep hold does not hold it, and the charter still reads as if the sweep
were pending, which is the one reading under which nobody would notice. Note the charter names
`doctor/` as the offender; `doctor/` is now clean and the tabs live in three other subsystems, so
the rule is stale in its evidence as well as its tense.

This is the finding that best satisfies the bar's third clause: an agent asked to extend the
engine reads this file as the spec and cannot tell a constraint from a backlog item.

---

## Summary

| id | stands | tier |
|---|---|---|
| NW-01 | yes | refactor (unchanged) |
| NW-02 | yes, narrowed | **note** (was refactor) — structural half of the remediation contradicts M2, do not execute |
| NW-03 | yes | refactor (unchanged) — drop the docs-register/ASC justification, narrow to dead-weight citations and unreachable pointers |
| NW-04 | yes | refactor (unchanged) — strongest of the four |

# Fresh-context verification — walk-newcomer findings (2026-08-26)

Verifier had no part in producing the walk. Each finding tested in both directions against the
code and against docs/internal/code-idioms.md, docs/internal/docs-register.md,
docs/internal/engine-rulings.md, CONTRIBUTING.md and package.json.

## NW-01 — no internals map for src/lib — **STANDS** (tier: refactor, unchanged)

Confirmed:
- `ls src/lib/*.md` → nothing. No `src/lib/README.md`.
- `grep -rniE "internals map|engine map|internal architecture|module map"` over
  `docs/internal/`, `ROADMAP.md`, `CONTRIBUTING.md`, `docs/STATUS.md` → **zero hits**. No prior
  ruling sanctions the absence, and nothing is filed as deferred work.
- `CONTRIBUTING.md:128-130` gives `src/lib/` exactly the quoted three-clause entry.
- `docs/extend/architecture.md` is 141 lines and mentions **no** internal directory: grep for
  `audit/|content/|github/|nav/|diagnostics/` returns one line, and it is
  `architecture.md:47` naming `src/lib/cairn.config.ts` (which is itself BREAK 1, a separate
  wrong-path bug the walk found: the scaffold and showcase put the adapter at
  `src/theme/cairn.config.ts`).
- Measured directory weight (files / lines, .ts + .svelte):
  components 79/23491, sveltekit 36/9650, audit 40/8857, content 30/4366, reproductions 12/2390,
  doctor 16/2212, render 19/2287, admin-toolkit 16/2171, delivery 20/1562, auth-channel 5/1548,
  media 15/1348, auth 6/841, github 6/825, nav 1/431, vite 4/427, media-seed 4/314,
  diagnostics 3/252, cloudflare 4/243, log 3/128, islands 2/98, design 1/35, auth-crypto 2/13,
  auth-store 1/17. The finding's audit=8857 and sveltekit=9650 numbers are exact.
- `docs/internal/api-surface.md` is not a counter-example: it is a **generated flat list** of
  export names and their structural types ("GENERATED — run `npm run check:surface -- --update`"),
  with no directory, no ownership, no request path.

Counter-case tested and rejected: the closest thing to a map is the per-barrel header convention
(below, NW-02), which orients a reader who already knows which file to open. It cannot answer
"where does a request enter" or "which of these 23 directories owns X".

## NW-02 — public subpath vs internal directory indistinguishable — **STANDS**, with one
remediation clause found unsound (tier: refactor, unchanged)

Confirmed core claim. `package.json` `exports` has 18 keys; 13 map to `src/lib` directories
(sveltekit, components, admin-toolkit, islands, render, delivery, media, reproductions,
auth-store, auth-channel, auth-crypto, cloudflare, vite) and 10 directories are internal
(audit, auth, content, design, diagnostics, doctor, github, log, media-seed, nav). The count is
exact. They interleave alphabetically with no naming or nesting signal.

Confirmed line counts: `auth/` 841, `auth-channel/` 1548, `auth-crypto/index.ts` 9 lines of
which 1 is the re-export (the walk said 13 for the directory, which is index.ts + browser.ts),
`auth-store/index.ts` 17. Four adjacent directories, three kinds of thing: accurate.

**Mitigation the walk missed, worth recording.** A strong convention already exists in the file
headers: every public barrel opens `// cairn-cms: the public `/x` barrel` (verified on
admin-toolkit, islands, delivery, media, cloudflare, vite, sveltekit, components, auth-channel,
auth-crypto, auth-store), and every internal barrel says so explicitly (`audit/index.ts`
"The audit is internal (no public package subpath)"; `diagnostics/index.ts` "Internal barrel …
Not re-exported from any public package subpath"; `doctor/index.ts`, `media-seed/index.ts` the
same). So the discriminator is one file away, not two — but only for directories that HAVE an
`index.ts`. Six do not: `auth/`, `content/`, `design/`, `github/`, `nav/`, and **`render/`**.
`render/` is the sharp case the walk did not name: it is a PUBLIC subpath
(`"./render": {"default": "./dist/render/authoring.js"}`) whose entry is `authoring.ts` sitting
in a flat directory of 19 files with no barrel and no header saying which one is the door.

**Remediation clause that does not survive.** "Retire the two shim directories by moving
`auth/crypto.ts` and `auth/store.ts`'s provisioning half to the public directories" would break
a deliberate design. Both barrels are **curated subsets with a written selection rule**:
`auth/crypto.ts` exports 11 symbols and the barrel re-exports 6, deliberately withholding
`TOKEN_TTL_MS`, `SESSION_TTL_MS`, `SEND_COOLDOWN_MS`, `sessionCookieName`, `csrfCookieName`, and
its header says exactly why ("a TTL is a site's own ruling … the engine's own cookie-name
functions … the two-stores blur the `cairn_` namespace reservation warns against").
`auth/store.ts` exports 15 and the barrel re-exports 8, withholding `findEditor`, `issueToken`,
`consumeToken`, session handling, with the reason stated. `auth-crypto/` is also not a pure
shim: `browser.ts` is a `browser`-condition target that throws
`'@glw907/cairn-cms/auth-crypto is server-only'` at import so the Web Crypto primitives cannot
reach a client bundle. Moving the implementation into the public directory would relocate the
withheld internals into a directory the barrel exists to keep them out of. The finding's other
remediation (make the split visible in the tree, give `render/` a declared entry, gate a new
directory's side in `check:surface`) is sound; that clause is not.

## NW-03 — unresolvable process references in shipped source comments — **STANDS**, counts
slightly overstated, one cited rule mis-scoped (tier: refactor, unchanged)

Re-counted independently over `src/lib`:
- `Plan \d\d`: **13**, not 17. (The walk's 17 appears to be a `grep -c` line count artifact.)
- The composite pattern `C2 breaking-window pass|export-rule sweep|R[0-9] ruling|Pass [A-Z]|spec
  N.N|Task NN|phase-3a|2a fetch`: **192** occurrences (walk said 189; direction and magnitude
  right).
- `docs/superpowers/…` paths: **19**, exact.
- Consumer-site mentions (`ecxc|aksailingclub|907.life`): **18**, exact.

Every quoted line verified verbatim: `src/lib/index.ts:5-6`, `:38-39`, `admin-action.ts:1-10`
("Part C item 3 of the phase-2 design suite" then "SCAFFOLD FINDING … aksailingclub-org's
club-admin-scaffold"), `cairn-admin.ts:275` ("spec 2.8, Task 15"), `:316` ("2a fetch actions"),
`:323` ("Pass C library actions").

**Strengthened.** `package.json` `files` is `["dist","migrations","skills","CHANGELOG.md",
"docs/README.md","docs/why-cairn.md","docs/reference","docs/admin","docs/editors","docs/extend"]`
— `docs/superpowers/` is not shipped, as claimed. And the comments themselves DO reach the
installed package: `dist/index.js` line 1 carries
`// The access map (admin access map and attention seams pass): …`. So an installing developer
reads the unresolvable citation, not just a GitHub visitor.
`diagnostics/conditions.ts` is a second instance in one file: its header ends
"See docs/superpowers/specs/2026-06-08-cairn-diagnostics-initiative-design.md."

**One cited rule does not apply as stated.** The finding invokes "the docs-register rule that
never names ASC publicly". `docs/internal/docs-register.md:356` reads "Name types of
functionality, never a specific consumer site" and sits inside the anatomy of a **published
docs page** (the extensibility-claim section, beside "Examples state what could be built; they
never pitch"). Its scope is published docs prose, not `src/lib` comments; no in-repo rule
governs consumer-site names in source. The observation is still fair on its own terms (an
MIT-licensed public tarball naming three private sites), but it is a judgment call the repo has
not ruled on, not a violation of a standing rule. The 189/192 unresolvable-citation half needs
no such support and carries the finding by itself.

## NW-04 — code-idioms.md written as a completed pass's to-do list — **STANDS**, fully
verified (tier: refactor, unchanged)

Every claim checked and true.
- CLAUDE.md calls it "the idiom charter, one obvious way per pattern";
  `docs/internal/README.md` calls it "the agent-facing idiom charter … a standing pass
  dimension". Its own header says "This is a standing pass dimension".
- Future-tense rules verified verbatim: M1 "The stragglers (`pending.ts`, `fields.ts`, `env.ts`,
  two auth files) converge"; M2 "`doctor/index.ts` moves its resident logic out to honor this";
  M3 "are retired by retargeting their importers"; M4 "the tab-indented `doctor/` tree and its
  test cluster converge, and an `.editorconfig` records it"; A2 "becomes **one shared helper**
  (its four near-verbatim copies …)".
- Process-residue sections present as described: `## Structural decisions (this pass)` (lines
  158-172) and `## Sweep clusters (Task 4 partition, riskiest first)` (line 184+, eight numbered
  work packages).
- **Mixed status confirmed by spot-check, which is the point of the finding.**
  - A2 **LANDED**: `src/lib/content/cross-branch-index.ts` exists and
    `advisories.ts`, `reference-index.ts`, `tag-usage-index.ts`, `media/usage.ts` all import
    `buildCrossBranchIndex`.
  - M2 **LANDED**: `doctor/index.ts` is now eight lines of pure re-export and its header says
    "it carries no logic of its own" — yet the charter still states the move as pending.
  - M4 **DID NOT LAND**: `grep -rlP '^\t' src/lib` returns exactly the 8 files named
    (`diagnostics/error.ts`, `diagnostics/conditions.ts`, `sveltekit/tidy-prompt.ts`,
    `components/{tidy-categorize,chrome-guard,editor-tidy,tidy-diff,tidy-validate}.ts`), and the
    tabs are real leading indentation, not string content (conditions.ts: 200 of 228 lines;
    tidy-diff.ts: 130 of 196; chrome-guard.ts: 30 of 64).
  - The `.editorconfig` header claims verbatim that it "records the code-idiom charter's M4 rule
    … so an editor enforces it going forward instead of relying on a one-time sweep to hold",
    and `grep -n indent eslint.config.js` returns **nothing** — no lint rule, and no `check:*`
    script covers indentation (28 `check:*` targets enumerated; none is an idioms gate).
    Advisory-only, and the sweep did not hold. Exactly as the finding states.

No ruling sanctions the file's current form. Its own header ("a pass that changes an idiom
updates this file, the same as a reference page") argues the opposite: the charter is meant to
be maintained as a live standard, which is what a to-do-list voice prevents.
