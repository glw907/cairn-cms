# History, revert, and public preview: the Phase F design

The F1+F4 design sitting, run 2026-08-06 (Fable, batched per the 2026-08-05 STATUS queue). This
spec settles the semantics of the three core features the beta gates on: entry history, revert,
and public preview for a non-editor. All three were ratified 2026-08-01 as landing before the
public beta and bundling into RELEASE ONE. The vocabulary was reserved earlier, by the C2
breaking-window pass (R11, 2026-08-02); this sitting designs what the names mean, and revises one
of them (the preview route shape, part 3). The ROADMAP entries this spec consumes live under
"Now"; the pass series it feeds is "The pre-beta pass series" under "Toward 1.0".

Every decision below is Geoff-ratified from this sitting unless marked as a plan-time call.

**Adversarial round, same day.** Three design-level reviewers (a web-auth security lens on the
token discipline, a SvelteKit lens on the data-shape-reuse claim, a general red team on the
revert semantics) ran against this spec and its plans before any implementation, pulling pass
two's mandatory pre-dispatch review early. Their findings are folded throughout; the paragraphs
below marked *(round 2)* changed as a result. Three calls went back to Geoff and are ratified:
the preview route accepts the site's globbed corpus in the Worker bundle for v1 (a bundle-size
assertion warns, and the narrowed manifest-backed resolver files to ROADMAP); a revoke-all
affordance ships in the preview pass; undelete stays out of v1 (history for a deleted entry
404s like the edit view, and the capability files to ROADMAP with the recently-deleted surface
it actually needs).

## The premise: what the machinery already makes durable

Three facts of the existing architecture ground every choice here.

**The durable per-entry history is the publish history.** A save commits to the per-entry
`cairn/<concept>/<id>` branch; a publish copies the result to `main` as one commit, author the
editor, committer the App bot; and the pending branch is then deleted (as it is on discard). The
save-by-save record is ephemeral by existing design. What survives forever is `main`'s commit log:
one commit per publish, attribution already in the author field.

**The `Backend` seam reads files and branches, not history.** Its surface today is `readFile`,
`readEntries`, `branchHead`, `listBranches`, `commit`, `createBranch`, `deleteBranch`. Nothing
reads a commit log, so history costs exactly one new additive member.

**The public pages prerender.** There is no server behind an entry's real URL at request time,
and a draft is not in the manifest that route reads. Any preview of a draft therefore needs its
own never-prerendered surface; "draft mode" on the live URL is architecturally unreachable, not
merely unchosen.

## Part 1: entry history

**A version is a publish.** The history view lists the entry's commits on `main`, nothing else.
The rejected alternatives: including save-level history would require making the pending branch's
commits durable (new storage, and a view whose older rows mysteriously carry less detail than
recent ones); showing the open draft's saves as a live group would present rows that vanish at
publish, which an editor reads as loss. The publish list also matches the persona: a
non-technical author thinks in "the version that was live last Tuesday," not in save events.

**The view is metadata only in v1.** Each `HistoryEntry` row carries the commit ref, the editor
(the commit author), and the date. No read-only content view, no diff. Revert is the viewer:
because revert lands as a draft (part 2), "revert to March 3rd" drops the old content into the
ordinary edit screen, live preview included, with discard as the no-harm exit. A separate viewer
would duplicate that moment, and a markdown diff is the developer's instinct, not the editor's.
For calibration: the mainstream tools (WordPress, Notion, Contentful, Ghost) do ship content
views or compares; the git-based cohort cairn belongs to runs metadata-thin. The call stands on
cairn's own revert-as-draft mechanics, not on industry posture. If real editors want comparison,
the friction log catches it and a read-only view rides a later pass additively.

**Bounded read, no pagination.** `historyLoad` reads the most recent ~25 publishes (exact number
a plan-time call) through the new backend member. When the log runs deeper, the view says
"showing the most recent N" rather than paginating. A synthetic top row appears when a pending
branch exists: "unpublished draft, started by X", giving the view one honest live element without
mixing save history into it.

**The view never claims completeness** *(round 2)*. The screen's own label is "recent versions,"
unconditionally: the commits API's path filter does not follow renames, so a renamed entry's
history restarts at the rename, and a completeness claim would be false there. Two adjacent
honesty rules ride along. The list shows every commit that touched the file, including commits
made outside cairn (a developer editing markdown directly, a repo-wide migration); the view
renders what git recorded rather than assuming an editor, degrading to the raw name or
"unknown". And a deleted entry's history is out of scope for v1: it 404s exactly as the edit
view does, the guide names the developer's git escape hatch, and undelete files to ROADMAP with
the recently-deleted surface it needs to be reachable at all (Geoff, 2026-08-06).

**The seam change.** One additive `Backend` member, shape at plan time approximately
`listCommits(path: string, ref: string, limit: number)`, returning per-commit ref, author, and
date, backed by the GitHub commits API's path filter. The facade view is the reserved `history`;
the route-factory member is the reserved `historyLoad` returning `HistoryData`.

## Part 2: revert

**Revert is "start a draft from an old version," not a time machine.** `revertAction` takes a
target ref from a history row, reads the entry file at that ref, creates the pending branch, and
commits the old content onto it. From that moment it is a draft like any other: the edit screen,
the live preview, and the unchanged deliberate Publish gate. Nothing goes live at revert time.
`commit.reverted` logs at the revert commit with `concept`, `id`, `editor`, and the reverted-to
ref, per the reserved event shape.

**The collision case refuses, fail-closed.** When a pending branch already exists, `revertAction`
answers with the reserved `RevertFailure` (an `ActionFailure`, staying on the page) naming the
blocker: the draft's author and start date, and the instruction to publish or discard it first.
There is no overwrite path, not even behind a confirmation: the draft may be another editor's
work, and a confirm dialog does not make destroying it safe, only fast. The legitimate
self-draft case costs one extra step (discard, then revert), and discard already carries its own
deliberate moment. This matches the house refusal doctrine everywhere else in the engine (the
delete gate refusing on inbound links, conflicts answering 409 in place).

**The backend call is the authoritative gate, not the check** *(round 2)*. GitHub's ref-create
POST is create-only, so refuse-on-collision is guaranteed by the platform; the branch-exists
pre-check demotes to a fast path for a friendly message. `createBranch`'s already-exists failure
maps to a typed conflict both backends throw identically (the dev backend today silently
clobbers where GitHub 422s, a pre-existing defect the pass fixes), and `revertAction` catches it
into the same `RevertFailure` rather than a raw 500 when two editors race. Revert's own commit
passes the expected head it just created, so a save that lands in the window answers 409 instead
of being silently overwritten. Two further refusals join the family: `history_stale` (the
history form carries `main`'s head; a mismatch means someone published since the page rendered,
and reverting would silently undo their work), and the posted ref must be a member of the
freshly re-read history list (full-sha, exact match), which gives `ref_unknown` one meaning,
makes `commit.reverted`'s provenance true by construction, and states a deliberate consequence:
only the listed recent publishes are revertable through the UI.

**Reverted content is validated, warn-not-refuse** *(round 2)*. Revert must not commit raw old
bytes blind: an old version can carry frontmatter fields the schema has since retired (which the
edit screen would silently drop on the next save, making "restore" quietly not mean restore),
vocabulary values since removed (which the prior-tags union would launder back into the allowed
set), and links or includes to since-deleted targets. `revertAction` parses and validates the
old version before creating the branch and carries the failures onto the edit screen as
advisories, through the same channel save's advisories already use: "this version predates a
change to this content type," naming the fields. Refusing outright would make old versions
permanently unrevertable, which is the wrong answer for the persona; the Publish gate stays the
hard backstop it already is.

## Part 3: public preview for a non-editor

**The rejected shape, recorded because its flaw is instructive.** The first proposal was a
dedicated `RequestHandler` serving the rendered entry in a neutral typographic shell (the
`createMediaRoute` precedent, and the shape R11's reservation anticipated). It fails on content
components: a `cta` or a carousel emits build-function HTML whose whole appearance lives in the
site's stylesheet, and an island does not hydrate without the site's client runtime. In a neutral
shell such content is not "the words without the fonts" but a broken-looking page, and
component-heavy drafts are precisely the ones an editor most wants reviewed. A shell that chased
fidelity through configuration (stylesheet lists, script injection) would rebuild the site's
asset pipeline badly, one option at a time.

**The chosen shape: a site-mounted, never-prerendered preview page that reuses the site's own
entry-rendering path.** The site mounts `/preview/[token]` the same way it mounts everything else
in the embedded-routing model, **inside the same layout group as its entry pages** *(round 2)*:
the stylesheets and chrome live on the layout chain, so mounting outside the group reproduces
exactly the unstyled page the rejected shape was rejected for. The cairn-provided load,
`previewLoad`, verifies the token, reads the draft off the pending branch, runs it through the
same composition the public load runs, and returns the same data shape the public entry page
receives, plus preview metadata (`preview.state: 'draft' | 'published'`, the expiry, and the
live permalink in the ended case below). The site's preview page component then does what its
public entry page does. Fidelity is a structural consequence rather than an approximated
feature: full CSS, working build-function components, hydrating islands, because it is a real
page in the site's own app. The default banner treatment ships as a small cairn component; the
load's metadata feeds it.

**"Same composition" is enforced by construction, with two named exceptions** *(round 2)*. The
public entry shape is built in site code from the config the site passes `createPublicRoutes`
(`composeRuntime` alone cannot construct it), so `previewLoad` takes that same config object as
a parameter: the site hands over the literal object it already built, and shape drift becomes a
compile error rather than a convention. The type contract is explicit: the return is the public
entry shape intersected with `preview`, with a compile-time assertion that no other key differs.
The two exceptions, stated rather than discovered: the link and fragment resolvers are the
admin preview's *marking* pair built from the pending branch's manifest, never the build's
*throwing* pair (a draft linking an unpublished sibling must render with the link marked, not
500); and the media resolver reads `media.json` off the backend at request time (branch first,
`main` fallback), because the site's build-time media snapshot is stale in exactly the
share-a-draft window. Preview media is thereby strictly fresher than the public site, the
correct polarity.

**The fidelity boundary, stated honestly** *(round 2)*. Preview is faithful for the entry
itself. Anything computed over the corpus reflects *published* state: references and bylines
resolve against the live corpus (a draft author pointing at an unpublished page shows no
byline), newer/older links, tag indexes, and nav are the published ones, canonical and og:url
tags carry the draft's future permalink (which does not resolve yet), and the raw-markdown twin
a site advertises does not exist for a draft. Interactive islands in the site's chrome are live
on the preview page for whoever holds the link, the read kind fetching published state and the
write kind (a signup form) genuinely operational; a site that wants them quiet on previews gates
them on `preview`. One deliberate v1 cost rides this shape (Geoff, 2026-08-06): the site's
public-routes config carries its build-time globbed corpus, so the never-prerendered preview
route pulls that corpus into the deployed Worker bundle, roughly 1-2MB at club scale against
Cloudflare's 10MB paid ceiling. A bundle-size assertion on the showcase build warns before it
bites, and the narrowed manifest-backed resolver that would restore the corpus-stays-out
invariant files to ROADMAP, triggered by a real site approaching the limit.

**Token discipline: opaque D1 rows, not signed tokens.** `mintPreviewToken` inserts a row in
`AUTH_DB`: token hash, concept, entry id, issuing editor, expiry. Verification is a lookup. This
is the same opaque-row discipline the rebuilt auth chose for sessions, and it avoids the
stateless alternative's real cost, a new per-site signing secret to provision, for a saving of
one indexed D1 read on a page a handful of humans will ever load. A new bundled migration ships
the table, same opt-in discipline as the audit sink's (and its guide entry says what the table
needs rather than only naming the file, per the ASC migration's correction). The security round
confirmed the primitives *(round 2)*: 256-bit tokens make enumeration a non-threat, the
hash-then-lookup path needs no constant-time discipline (and must not grow one as cargo cult),
and the multi-use non-consuming GET is structurally immune to the email-scanner prefetch that
burns magic links, a deliberate property worth keeping stated.

**Minting is an authority-delegation action** *(round 2)*. It converts one editor's read on a
concept into an unauthenticated public read for anyone holding the URL, so it carries the full
entry-scoped authorization every other entry action carries (`requireEntryFromParams`: editor
capability plus the access map), not merely the view gate. A site restricting a concept by
access map should know that everyone admitted to it can hand its drafts to the internet. And
because the preview page is a real page in the site's own app, the URL, which is the
credential, flows wherever the site's chrome sends URLs: analytics beacons, client error
reporting, canonical and og tags. The guide requires suppressing those emissions on the preview
route, keyed on the `preview` flag the load provides.

**A preview link dies with its branch, and can be killed sooner** *(round 2)*. Verification
requires the token row valid, unexpired, and the pending branch still present, in that order,
expiry strictly before any branch read. Publish and discard both delete the branch, so every
outstanding preview link for an entry expires naturally the moment the draft stops being a
draft. Rename, delete, and discard also clear the entry's token rows (which closes an id-reuse
collision where a stale token could resolve to a different entry's later draft); **publish
deliberately does not**, because the ended page below requires the row to outlive the branch,
a coupling that must not be "fixed" by a later cleanup. For the mis-shared-link incident, a
revoke-all affordance ships on the edit screen (Geoff, 2026-08-06): one delete by concept and
entry id, same authorization as minting. Expired rows sweep opportunistically at insert time,
the same no-cron idiom the magic-token and session stores already use.

**The ended page never claims more than it knows** *(round 2)*. A valid, unexpired token whose
branch is gone renders "this preview has ended," linking the entry's live version when the
entry's file exists on the default branch. The earlier draft of this spec had it say "this
draft went live," which lies after a discard-of-an-edit (the branch is equally gone, and the
reviewer would read the current live version believing they reviewed the draft). The softened
copy is true in every case, costs no predicate machinery, and the expiry-first ordering keeps
an expired token from becoming a perpetual has-it-published-yet probe. Every other failure path
is `preview.rejected` with its snake_case `reason` (`unknown`, `expired`, `branch_gone`),
identical outward 404s in status and body; response timing differs by class (the fast paths
precede any network call) and that is accepted rather than papered over with artificial delay.

**Scope and expiry.** A token grants read on one draft entry. No cookie is set, no session
exists, nothing else becomes reachable. Expiry defaults to 7 days, configurable through
`PreviewTokenConfig` (validated: finite, positive, one minute to 30 days), multi-use within its
window: the magic link's 15 minutes is authentication discipline, where this is a
share-with-a-colleague artifact that must survive a weekend. Minting runs from an editor action
on the edit screen; the member and facade keys (mint and revoke) derive under R1's grammar at
plan time, and any absolute URL the screen shows derives from `PUBLIC_ORIGIN`, never the
request's own host. The preview response carries its own headers on every path, refusals
included (`noindex`, `no-store`, `no-referrer`, `nosniff`, frame denial): `/preview` is not an
admin path, so the guard's header layer never touches it, the same reason the media route
carries its own.

*(round 2: the earlier media assumption is superseded by the request-time media-resolver
mechanism above, which the adversarial round showed the assumption actually required: the
binding constraint was the site's build-time manifest snapshot, not R2 presence.)*

**Round 3 corrections (execution task 0, 2026-08-06).** The pre-dispatch confirmation round
(web-auth-security plus SvelteKit data-shape, against the code at `11a5f8a1`) corrected four
factual assumptions above; each is a drift fix forced by the code, not a design change.

1. **There is no pending-branch manifest.** Pending branches carry no manifest copy
   (`content-routes-context.ts`: "Always read from main"); a branch read would return main's
   copy as of the fork, strictly staler. The marking link resolver builds from the DEFAULT
   branch's manifest with the draft's own re-derived row upserted in memory, the exact pair
   the save-time link guard uses (`manifestEntryFromFile` + `upsertEntry`). `media.json`, by
   contrast, IS committed to the branch by save, so branch-first stands for media only.
2. **"Same composition by construction" requires an extraction, now authorized.**
   `entryLoad` is lookup-driven and its composition (hero derivation, SEO unify, resolver
   choice) is closure-private, so handing `previewLoad` the config alone would produce a
   hand-copy that merely typechecks. The per-entry composition extracts from
   `src/lib/delivery/public-routes.ts` into an exported `composeEntryData(...)` that takes
   resolver overrides; `entryLoad` becomes lookup-then-compose and `previewLoad` calls the
   same function with the marking pair and the request-time media resolver
   (`buildMediaResolver` with `runtime.resolvedAssets` over branch-first `media.json`, never
   the lean `manifestMediaResolver`, whose hardcoded url form would break twin-render
   equivalence). The concept descriptor comes from `runtime.concepts`; `PublicRoutesConfig`
   cannot reach it and must not be made to.
3. **The fragment-marking half exists only as component-inline code.** It extracts as
   `manifestFragmentResolver` beside `manifestLinkResolver` in `src/lib/content/manifest.ts`,
   and the admin edit preview repoints to the extraction so no second copy ships. The
   non-routable-concept filter the admin applies to link targets applies to preview
   identically, and preview does not set `previewTitle` (the boundary eyebrow is an editor
   affordance, wrong on a public share page).
4. **The `locals` constraint means session state, not the whole bag.** `previewLoad` never
   reads `locals.cairnEditor` or `locals.cairnAccess` and sets no cookie; it resolves its
   backend through the standard `locals.cairnBackend ?? runtime.backend.connect(env)` seam,
   which is how the showcase e2e and the integration suite exist at all.

The same round hardened the storage and lifecycle half: `expires_at` stores INTEGER epoch
milliseconds like its sibling tables (a TEXT column against a numeric bind would make every
token immortal under SQLite's cross-class comparison, invisibly to any test that round-trips
through one helper); row cleanup lives inside `deleteEntry` covering both success exits, so
the list-initiated delete cannot bypass it; `deleteEditor` and `removeOwnerIfNotLast` cascade
to `preview_tokens`, matching the session and magic-token cascade (an off-boarded editor's
outstanding links die with their access, while a mere role or access-map change deliberately
does not retro-revoke, the revoke-all affordance being the remedy); and the missing-table
state (binding wired, migration unapplied, the likeliest half-configuration) answers the same
uniform 404 with its own log reason rather than a raw D1 500. The `preview.rejected` reason
vocabulary grows accordingly: `unknown`, `expired`, `branch_gone`, plus `row_invalid` (stored
concept or id no longer valid against the config), `draft_invalid` (the draft fails its
descriptor's validation, a state revert-as-draft can legitimately produce, logged distinctly
so it never masquerades as a token bug), and `table_missing`. Frame denial is
`x-frame-options: DENY` (a CSP `frame-ancestors` set from a load would collide with a site's
kit-generated CSP header), the full header set issues in one `setHeaders` call as the load's
first statement, all refusals share one literal not-found message constant, and the
missing-binding refusal is `error(503)` after the binding-named log (a load cannot return a
bare Response, so "exactly the media-route precedent" softens to "the same log, the same
status").

## Vocabulary deltas

New names from the adversarial round *(round 2)*, each derived under the ratified grammars and
confirmed against `docs/internal/api-surface.md` at plan time: `RevertFailure` gains reasons
`draft_exists`, `ref_unknown`, and `history_stale`; the revoke affordance's member and facade
key follow the mint's R1 derivation; `preview.token.revoked` joins the log vocabulary (R6
shape, carrying concept, id, editor, and the count of rows cleared); and `PreviewData.preview`
carries the discriminant `state: 'draft' | 'published'`. One disambiguation note rides the
reference docs: `CairnRuntime.preview` (the admin editor's preview styling) and this
draft-share family are different subsystems that happen to share a word.

Reserved names consumed unchanged: `historyLoad`, `history`, `HistoryData`, `HistoryEntry`,
`revertAction`, `revert`, `RevertFailure`, `commit.reverted`, `mintPreviewToken`,
`PreviewTokenConfig`, `preview.token.minted`, `preview.rejected`.

One revision: `createPreviewRoute(runtime): RequestHandler` un-reserves. The site-mounted page
shape makes the engine's offering a load, and `previewLoad` sits inside R1's ratified grammar
(the `Load` suffix for members that are SvelteKit loads) rather than beside it on the
`createMediaRoute` exception. The reservation existed so the feature would arrive under the
grammar; this stays under the grammar, one door over. The ROADMAP entry updates when this spec
lands.

## Shape of the work

**Two passes, not three.** History and revert merge into one pass (the F2/F3 merge the ROADMAP
anticipated): they share the backend member, the facade view, and the pipeline. Preview stands
alone as the second pass.

**The pre-dispatch adversarial review ran early**, 2026-08-06, in the design sitting itself
(the security, SvelteKit, and red-team lenses above), and its findings are folded into this
spec and both plans. Pass two's task 0 therefore becomes a light confirmation that nothing
drifted between this spec and the code the pass starts from, not a fresh round.

**Preview is a permanent public surface**, so per the standing rule it gets two or more
adversarial reviewers on different lenses (`web-auth-security-reviewer` mandatory among them)
BEFORE the first implementer dispatch, not at pass end.

**Everything is additive.** A site that mounts no preview page and applies no migration is
untouched, so the `Consumers must:` load lands only on adopters, inside RELEASE ONE's window as
planned.

**Testing.** Unit coverage on mint, verify, expiry, and every refusal path; showcase e2e that
mints a token, fetches the preview page without a session, proves the draft renders with a
component in it, and proves the three rejection paths plus the published-entry courtesy page.
The history/revert pass covers the backend member against recorded fixtures, the synthetic
draft row, the collision refusal, and a full revert-then-publish round trip.

## Plan-time verifications (assumptions this spec makes checkable rather than silent)

Two of the original four resolved in the adversarial round: the media assumption became the
request-time resolver mechanism in part 3, and the rename question is answered (`renameAction`
exists, so history truncates at a rename, which is why the view says "recent versions" and
never claims completeness). Still open for the implementing passes:

- The exact bounded-read size and whether the GitHub commits API's path filter behaves under the
  App installation token as it does under a user token.
- The R1-derived names for the mint and revoke actions' members and facade keys.
- That the site's public composition does not itself filter unpublished entries when handed a
  draft directly *(round 2)*: if a site's composition applies its own draft or scheduled-date
  filtering, the preview renders empty and the failure masquerades as a token bug. If it fails,
  it is a design input, not a patch site.
