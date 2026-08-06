# History, revert, and public preview: the Phase F design

The F1+F4 design sitting, run 2026-08-06 (Fable, batched per the 2026-08-05 STATUS queue). This
spec settles the semantics of the three core features the beta gates on: entry history, revert,
and public preview for a non-editor. All three were ratified 2026-08-01 as landing before the
public beta and bundling into RELEASE ONE. The vocabulary was reserved earlier, by the C2
breaking-window pass (R11, 2026-08-02); this sitting designs what the names mean, and revises one
of them (the preview route shape, part 3). The ROADMAP entries this spec consumes live under
"Now"; the pass series it feeds is "The pre-beta pass series" under "Toward 1.0".

Every decision below is Geoff-ratified from this sitting unless marked as a plan-time call.

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
in the embedded-routing model. The cairn-provided load, `previewLoad`, verifies the token, reads
the draft off the pending branch, runs it through the same composition the public load runs, and
returns the same data shape the public entry page receives, plus preview metadata (expiry, the
draft flag, and the published permalink in the courtesy case below). The site's preview page
component then does what its public entry page does. Fidelity is a structural consequence rather
than an approximated feature: full CSS, working build-function components, hydrating islands,
because it is a real page in the site's own app. The default draft-banner treatment ships as a
small cairn component; the load's metadata feeds it.

**Token discipline: opaque D1 rows, not signed tokens.** `mintPreviewToken` inserts a row in
`AUTH_DB`: token hash, concept, entry id, issuing editor, expiry. Verification is a lookup. This
is the same opaque-row discipline the rebuilt auth chose for sessions, and it avoids the
stateless alternative's real cost, a new per-site signing secret to provision, for a saving of
one indexed D1 read on a page a handful of humans will ever load. A new bundled migration ships
the table, same opt-in discipline as the audit sink's (and its guide entry says what the table
needs rather than only naming the file, per the ASC migration's correction).

**A preview link dies with its branch.** Verification requires the token row valid, unexpired,
and the pending branch still present. Publish and discard both delete the branch, so every
outstanding preview link for an entry expires naturally the moment the draft stops being a draft.
No revocation bookkeeping. One refinement is deliberate: a valid token whose branch is gone
because the entry published renders a "this draft went live" page linking the live permalink,
so a day-old link ends at the published page rather than a dead end. Every other failure path is
`preview.rejected` with its snake_case `reason` (expired, unknown, branch gone unpublished).

**Scope and expiry.** A token grants read on one draft entry. No cookie is set, no session
exists, nothing else becomes reachable. Expiry defaults to 7 days, configurable through
`PreviewTokenConfig`, multi-use within its window: the magic link's 15 minutes is authentication
discipline, where this is a share-with-a-colleague artifact that must survive a weekend. Minting
runs from an editor action on the edit screen; the member and facade key derive under R1's
grammar at plan time.

**Stated assumption, verified by the implementing pass.** Unpublished media resolves on the
preview page because uploads land in R2 at upload time, not at publish, and serve through the
site's existing media route. If that assumption fails in any path, it is a design input, not a
patch site.

## Vocabulary deltas

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

- Media resolution for draft-referenced uploads (part 3's stated assumption).
- Entry file-path stability: the commits API path filter reads one path, so if any edit flow
  renames an entry's file (a slug edit on an undated concept, for instance), history truncates at
  the rename. Verify whether a rename path exists; if it does, the view's bounded window makes
  this a documentation note, not a blocker.
- The exact bounded-read size and whether the GitHub commits API's path filter behaves under the
  App installation token as it does under a user token.
- The R1-derived names for the mint action's member and facade key.
