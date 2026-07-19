# Where each kind of state lives

Cairn keeps its content and config state in git, its runtime state in a self-owned D1 database,
and the media bytes that fit neither in R2, with only a reference in git. [The architecture
overview](./architecture.md#where-state-lives) names what lands in each store: content, site
config, and auth. This page is the rule behind that split. It sets out what a new kind of state
has to satisfy before it earns a place in any store, and it walks the three precedents, plus the
one exception, that the rule has already decided.

## The question that decides it

Git's atomic unit is a commit: a batch of file changes that either all land or none do, with a
full history of who changed what and when. Git fits anything whose value comes from having a
past. It fits poorly when a value has to be checked and safely changed inside a single request,
especially when another request might be racing it for the same answer. A commit can't express
"read this, confirm it still holds, and change it before anyone else gets the chance," because
there's no live row to hold a lock on between the read and the write. D1 is the opposite shape: a table, a `WHERE` clause, and a transaction give exactly that
guarantee, at the cost of carrying no history at all. So the question a new kind of state has to
answer is which of those two things it actually needs: a past, or a guarded read-then-mutate.
Everything cairn stores today falls cleanly on one side.

## Content: the state that wants a past

An entry's markdown and frontmatter, the content manifest that indexes them, and the media
manifest all live in git, because a past is the entire point. An editor's save is attributable, a
publish is a commit any later reader can inspect, and a mistake is recoverable by reverting that
commit. [The content model](./content-model.md) covers why a concept's shape is fixed rather than
open-ended, and [the commit pipeline](./architecture.md#the-commit-pipeline-holding-branch-to-publish)
covers the holding-branch-to-publish mechanics in full. What matters here is narrower: content is
a draft until an editor says otherwise, so its save writes to a branch named for the entry,
`cairn/<concept>/<id>`, and only publish copies it to `main`. Nothing about content asks git to do
a guarded, request-time mutation, so nothing about it needs D1.

## Config: the same store, a different draft state

A site's nav menus, its tidy conventions, and its tag vocabulary also live in git, in the
`site.config.yaml` file the engine's `parseSiteConfig` reads and an admin screen's save writes
back. That's the same answer to "does this want a past" that content gave: a nav change deserves
attribution and a rollback exactly as much as a content edit does. But config takes a different
path to get there. Saving a nav tree or a tidy setting commits straight to `main`, guarded by an
expected-head check against a concurrent write, with no holding branch in between. The reason is
what the state actually is: a tag vocabulary or a nav label has no meaningful draft state a reader
shouldn't see yet. The moment an editor saves it, it's supposed to apply, the same moment its
commit triggers the site's redeploy. Content's whole reason to exist as a holding branch is that a
reader hasn't seen the draft; config never has a draft in that sense, so it never needs one.

That's the second question a new kind of state runs through once the first has already put it in
git: does it have a draft state distinct from live? If a change should show up the moment it's
saved, it commits straight to `main`, the way nav and tidy settings do. If it shouldn't show up
until someone deliberately says so, it earns a holding branch, the way content does.

## Runtime state: the state that wants a guarded mutation

An editor's magic-link token, their session, and the allowlist that says who's an owner and who's
an editor all live together in D1, in three tables a single `AUTH_DB` binding reaches. They belong
together as one transactional domain, even though they look like three separate concerns sharing
a database. Consuming a magic-link token deletes its row and returns the email it belonged to in
one statement. A link that's already used or expired isn't there for a second request to consume,
no matter how closely the two race. Refusing to remove the last remaining owner works the same
way, by folding a live count into the same `DELETE`'s `WHERE` clause, so two concurrent removals
can't both pass a separate check and strand the allowlist at zero owners between them. And because
resolving a session joins it to the editor's row live rather than trusting a cached claim, a
demoted or removed editor's existing session stops working on the very next request instead of
waiting for it to expire on its own. None of those three guarantees is available to a commit: git
has no compare-and-mutate a concurrent request could race, only a linear history taken one commit
at a time. [The security model](./security-model.md) covers what each guarantee means for who may
open the admin. What carries over here is narrower: checking whether a token is still good,
whether an owner is the last one, and whether a session is still live are all the same
request-time question, and D1 is the only store cairn has that answers it safely under a race.

## Media bytes fail the first question too, for a different reason

Media asks the same first question content and config already answered, and fails it, but not
because it lacks a past. An uploaded image's identity is as permanent as a published entry's, and
in principle it could earn a history the same way. It fails on a more basic ground: a binary file
doesn't diff, so every re-save stores a full new copy rather than a change against the last one,
and a repo that kept media that way would grow without bound. So the bytes go to R2 instead, and
only a small logical reference, stable across a rename because it's keyed to the file's own hash
rather than its name, ever reaches git. [Media storage](./media-storage.md) covers the reference
scheme and why it's shaped that way. The lesson for a future kind of state is that "wants a past"
and "can afford to live in the store that keeps one" are two different questions, and a state has
to clear both before it lands in git.

A new kind of state runs the same two tests—does it want a past, and does it have a draft state
distinct from live—and bytes too large to diff go to R2 regardless.
