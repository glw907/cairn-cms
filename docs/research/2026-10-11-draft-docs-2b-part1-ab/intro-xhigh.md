# Act on newly published entries

An organization that publishes through cairn's admin often wants to announce each new post, by
email to its subscribers or by a message to its members, and cairn's part in that work is a record
of when each entry first went live. The subscribers, the message, and the service that delivers it
belong to the site, while cairn manages the markdown content and the admin that edits it. Every
cairn site commits a content manifest at `src/content/.cairn/index.json`, with one row for each
entry. An editor's publish commits the entry and its row together to the default branch. The first
publish that takes an entry live stamps that row with `publishedAt`, and every later save keeps the
stamp. The publish commit also triggers the site's deploy. A new post reaches its public address
only through the build that deploy runs, so a message that links to the post belongs after the
deploy. Between the manifests of two consecutive deploys, the new stamps are exactly those of the
entries that went live in between, and `buildNewlyPublished` returns those entries. An edit to a
live post changes no stamp and never reads as new. For the whole path from an editor's save to the
deploy, see the write path in [Architecture](architecture.md#write-path).

The work on your side is a job that runs after each deploy, finds the posts that deploy newly
published, hands each one to your send code, and saves the deployed manifest for the next run. The
publish actions call no site function once their commit lands. The adapter's one publish-time
member, `editor.publishActions`, is plain data the server resolves, and code that should follow a
publish runs either in that job or behind a link an editor follows. For a site that wants an editor
to take a next step at the moment of publishing an entry, with a person in the loop and no job,
"Add a next-step link after publish" covers the links that appear beside that entry's publish
confirmation.

The job needs a TypeScript module your deploy pipeline can run with Node, the storage your platform
offers, and your email or messaging code. It needs no cairn knowledge beyond publishing from the
admin. The pipeline that runs the job is yours, and this page names none. The next-step link also
assumes you know your site's adapter file and its `editor` block, both described in the
[`defineAdapter`](../reference/core.md#defineadapter) entry.

This page covers neither feeds nor delivery. Feeds, for subscribers who pull new posts instead of
being sent them, belong to "Build the public routes", and delivering a message belongs to your
email or messaging provider.
