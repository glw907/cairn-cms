# Stage 2a pilot record (task 6)

Agent-facing. Source: the pilot workflow's run record (`result.pages[]`) and the conductor's
post-run notes, 2026-09-30. Pre-pilot commit `73e57071`. Post-run whole-tree
`npm run check:docs-gate`: exit 0 (17 checks).

## Outcome

Run result: 0 of 6 pages accepted by the workflow, 6 escalated after round 2. Every escalation
carried a red page gate plus remaining blockers. The gate was red because the planned forward links to
extend pages not yet drafted read as broken (fixed by `c498b6fa`, "Pass a docs link to an outline
page not yet drafted as pending"); the blockers were genuine register and fact-read findings. Each
page was then resolved by one resolution pass under a conductor ruling, followed by scoped reviews.
All six are accepted. Page gates in the run were `fail` in both rounds on every page; the final
state is gate 0 per page and for the whole tree.

## Conductor rulings

1. The forward-link rule (`c498b6fa`): a link to an outline page that is not yet on disk passes the
   link check as pending, while the page it names stays absent. Applies to published arm paths only.
2. A page that escalates is resolved by a resolution pass (one agent, the page's open findings as input) plus scoped reviews (register, fact read, and a figure read where the figure
   changed), never by a third full chain round. A conductor ruling accepts a fix that applies a
   reviewer's own direction or a pure cut without a re-read.

## Per page

Agents: every pilot agent ran on `claude-opus-5-5` (outline on `claude-sonnet-5-5`). Drafter =
`draft:<slug>` then `redraft:<slug>`; fact read = `facts:<slug>:r1/r2`; register editor =
`editor:<slug>:r1/r2`; figure verifier = `figure:<slug>:r1/r2`. The resolver is the resolution
pass; the run record does not carry its model, and the notes name it only as the drafter for
security-model and add-a-custom-admin-screen (resolved by the drafter, gate 0) and as a resolution pass
for the rest.

Verdicts read `verdict(blocking count)`.

### security-model (concept)

- Status: escalated after round 2 (`second fix verdict or red gate`); resolved by the drafter
  (gate 0), f:z3a58a corrected in place. Resolution reviews: register accept, fact read accept.
- Round 1: register editor fix(7), fact read fix(2). Round 2: register editor fix(7), fact read fix(1).
  No figure.
- Cross-regression flag: false.
- Rows received 3, disposed 3 (all `carried`, context rows already on fact ids; none pending).
- `frictionFiled` (3): tidy and dictionary actions skip the access-map check when mounted without a
  concept param (f:arr13a); under identity nothing rotates the CSRF value (f:8rnym5, f:0vofop,
  f:9ik061); a cairn load mounted outside /admin gets no security headers and can mint a discarded
  `__Host-` cookie (f:horkxq, f:g22dnw, f:t976f1).
- Page-inputs cuts: f:r0cv6e, f:jud805, f:diro7m (out of scope for the page). Facts filed: none;
  three added ids (f:emrebl, f:33upyd, f:d2jumm).
- Optional, open: brief line 412 (`Referrer-Policy` off the site-wide default) may also map f:qbfriw
  beside f:ix10bm.

### replace-magic-links-with-cloudflare-access (task, figure)

- Status: escalated after round 2; resolved by a resolution pass. Resolution reviews: register
  accept, fact read accept, figure accept.
- Round 1: register editor fix(8), fact read fix(3), figure verifier fix(1). Round 2: register
  editor fix(2), fact read fix(1), figure verifier accept(0).
- Cross-regression flag: false.
- Rows received 3, disposed 1 (`IdentityResolver.label` filed to f:ojr3qm; the other two were
  context rows on f:3p8yu8, left unchanged).
- `frictionFiled` (2): IdentityResolver and `label` doc comments name `admin.login-probe-failed`,
  which nothing emits (f:ojr3qm, f:iaqcq6); logout under identity needs a live gate session
  (f:ig5pn3, f:8xxe3b, f:pwmybh).
- Facts filed: f:s9s8mw, f:ojr3qm, f:pwmybh.
- Cut (resolution): the caption clause "since a preview link's reviewer has no reason to be admitted
  to `/admin`" at :35-36 (unbacked), the preview exclusion (f:vnm1p5) kept, brief updated (Part B
  of the post-run step).
- Optional, open: brief :137-138 may add f:3p8yu8 beside f:s9s8mw. Fact Source line drift
  (f:fu4uis 112-115 to 114; f:fhit7f, f:k40l86, f:v5ndhs 285-293 to 286-) is cosmetic.

### add-cairn-to-a-sveltekit-app (tutorial)

- Status: escalated after round 2; resolved by a resolution pass. Resolution reviews: register
  accept, fact read accept.
- Round 1: register editor fix(7), fact read fix(8). Round 2: register editor fix(4), fact read
  fix(2). No figure.
- Cross-regression flag: false.
- Rows received 26, disposed 14 (11 `filed`, 1 `carried`, 2 `cut`); the other 12 received rows were
  fact-id context rows.
- `frictionFiled` (3): `auth.branding` replaces the runtime default whole, so a branding without
  `replyTo` drops the adapter's reply-to (f:v72g9z); SiteConfig description, author, and locale are
  accepted but read by no `src/lib` module (f:ebx4pv); f:t4pwpw and f:75hawi give different Workers
  Paid triggers, and no fact measures a hand-built bundle.
- Facts filed: f:g81luc, f:v72g9z, f:ebx4pv.
- Cuts: rows `ContentRoutesConfig.runtime` and `NavRoutesConfig.runtime` (excluded: the single mount
  forwards its own runtime); facts f:pg2smj, f:dzmj90, f:jzb3d0 (second half), f:t4pwpw (vendor
  figure, link the pricing page).
- Carry: f:5f4kmk and f:9yi7fu mis-state the committer (Part B item 1).

### architecture (concept, figure)

- Status: escalated after round 2; resolved by a resolution pass. Resolution reviews: register
  accept, figure accept, fact read fix (one sentence at :101) applied with the reader's own wording
  plus a caption cut; gate 0; the conductor accepted without a re-read.
- Round 1: register editor fix(7), fact read fix(5), figure verifier fix(1). Round 2: register
  editor fix(1), fact read fix(2), figure verifier accept(0).
- Cross-regression flag: false.
- Rows received 10, disposed 0 (no row read `pending architecture`; all ten were fact-id context
  rows, so nothing to dispose).
- `frictionFiled` (1): head-merge retry reuses precomputed whole-file manifests, so media delete and
  metadata can drop a concurrent `media.json` row while upload is head-guarded against it (f:0gihxq,
  f:0oyrh6, f:025q6u).
- Facts filed: none.
- Cuts: f:5vjwlc, f:pzbmhq, f:xkkt1o, f:2hnxsr, f:0435ck (out of scope or too deep), plus the
  resolution's caption cut.
- Flagged by page inputs: f:cjonmm and f:w379wu (the editor as committer) contested by f:5f4kmk (Part B
  item 1); f:549u00's Source quotes 0.97.0 while `package.json` reads 0.98.0 (pre-1.0 claim holds).

### add-a-custom-admin-screen (task, figure)

- Status: escalated after round 2; resolved by the drafter (gate 0; prose 3,226 to 2,926 words,
  brief 219 to 183 sentences). Resolution reviews: register accept, figure accept, fact read fix
  applied (new `[verified]` f:6vy0ka from `section-action.ts:208-209,310`; :387 split to f:68h31z and
  f:ff3l1u); the conductor accepted the fix as the fact reader's own direction.
- Round 1: register editor fix(6), fact read fix(5), figure verifier accept(0). Round 2: register
  editor fix(4), fact read fix(3), figure verifier fix(1).
- Cross-regression flag: true (the figure verifier regressed from accept to fix; it does not count
  toward the task 7 rate, see below).
- Rows received 7, disposed 5 (4 `filed`: three to f:hafpqf, `access.target` to f:bcybve; 1 `cut`; the two other
  received rows were context rows `SectionActionConfig.rateLimit` and `.resolveDb`).
- `frictionFiled` (2): one authorization predicate refuses through three differently shaped 403
  channels (f:10ojk8, f:xbjxit, f:bcybve); the dev-only chrome-wrap check points at the nonexistent
  `docs/admin-route-structure.md` (f:g7zuji, contributor).
- Facts filed: f:hafpqf, f:bcybve, f:vkfd7b; resolution adds f:6vy0ka, f:68h31z, f:ff3l1u.
- Cuts recorded here (the brief has no cut field): f:22odbz, f:2c19kf, f:2gdaks, f:2gmjvn moved to
  `cairn-audit.md` (`#configuration`, `#what-the-motion-rules-dont-cover`); f:bwn0uo, f:x8rhdh,
  f:pb0vh9, f:pyfbqv moved to `admin-toolkit.md` (`#statuschip`, `#listtoolbar`,
  `#admintable`/`#emptystate`/`#pagination`, `#mediapicker`); f:qmhbgs moved to `admin.md#editpage`;
  f:asujoi cut (contributor policy); f:qk0l7p cut (off-task, carried by `sveltekit.md` and
  `admin.md`); f:xh2mwb cut (frame-level falsity; f:326755 covers scope). Row
  `AdminActionOptions.isDev` excluded as a test seam.
- Open: the figure's reproduction (`toolkit/custom-screen`, the minimal Events screen) has not been
  rendered at 320 and 390 px; render both before the checkpoint.

### theme-your-public-site (task, defect `extraChecks`)

- Status: escalated after round 2; resolved by a resolution pass. Resolution reviews: register
  accept, fact read accept (scoped).
- Round 1: register editor fix(9), fact read accept(0). Round 2: register editor fix(2), fact read
  fix(2). No figure.
- Cross-regression flag: true (fact read accept to fix). This is the one page that qualifies for
  the task 7 rate.
- Rows received 6, disposed 6 (all `filed` to f:blhd7f).
- `frictionFiled` (4): the preview frame ground follows `base-100` while three comments and
  `docs/reference/core.md:174-176` say it pins white (f:faofr4, f:blhd7f); the scaffold's "about
  fourteen role values" names twelve (f:kt0epf); the scaffold's `theme.css` and styleguide comments
  name `check:public-tokens`, a gate a scaffolded site lacks (f:xv2ien); `public-css.md` sets the
  `--cairn-cta-*` keys in "Each daisyUI block" while Waymark sets them unlayered in `:root` (f:18qj2u).
- Facts filed: f:blhd7f, f:spn4hj, f:f28x0x, f:hva8r5, f:18qj2u.
- Cut: f:w6pqic (an upgrade delta for a site that copied the pre-export `tokens.css`; it belongs to
  the per-version records, and f:ylmc9c states the ink derivation the page needs). Page outline
  cites every other id.

## Rows received against the selection count

Selection count = rows reading `pending <slug>` plus rows whose fact id is in the page's outline
`factIds`, from `73e57071:docs/internal/option-map.json` and
`73e57071:docs/internal/outlines/extend.json`.

| Page | pending rows | fact-id rows | selection | rowsReceived | match |
| --- | --- | --- | --- | --- | --- |
| security-model | 0 | 3 | 3 | 3 | yes |
| replace-magic-links-with-cloudflare-access | 1 | 2 | 3 | 3 | yes |
| add-cairn-to-a-sveltekit-app | 14 | 12 | 26 | 26 | yes |
| architecture | 0 | 10 | 10 | 10 | yes |
| add-a-custom-admin-screen | 5 | 2 | 7 | 7 | yes |
| theme-your-public-site | 6 | 0 | 6 | 6 | yes |

No mismatch. Rows disposed (pending rows moved off `pending`): 0 + 1 + 14 + 0 + 5 + 6 = 26.
Option map `pendingCount`: 152 before, 126 after (152 - 26).

## Cross-regression rate

Flagged: 2 of 6 pages (add-a-custom-admin-screen via the figure verifier,
theme-your-public-site via the fact read). Qualifying pages per the task 7 definition (exactly one of
register editor and fact read returned `fix` in round 1; the figure verifier does not count): 1 of 6
(theme-your-public-site; every other page had both reviewers at `fix` in round 1). Rate: 1 flagged
of 1 qualifying. `bothReviewers` stays on for task 8 on this evidence.

## Cost

- Workflow: 6.09M agent tokens over 49 agents; the workflow's own `spent` unit reads 1,255,855.
- Resolution round: about 1.9M more.
- Total about 8.0M, about 1.3M a page.
- Geoff's weekly meter moved from 87% to 93% across the pilot and the resolution.

## Carry list (conductor)

Applied in the second post-run commit: committer wording in f:5f4kmk and f:9yi7fu; f:cvv6to
narrowing and Source; the `migration-notes.md` anchor repoint; the magic-links caption cut;
`isPublishedDoc` narrowed to the arm paths with a boundary test; the drift routine's re-scope in
`docs-maintenance.md`; friction-log entries (selected-`btn` and bare-`btn` look, fixed glyph and
wordmark, brief schema holds one fact id per sentence and no cut field so cuts live only in this
record, `tellgrader` `slop-hard` flags the proper noun "showcase").

Open for task 7: let a brief sentence carry several fact ids and a brief record its page's cuts
(`check-provenance.mjs` reads a single `s.id`; the brief has only `page` and `sentences`); the
admin-screen and theme resolvers split sentences and pushed cuts to this record.
