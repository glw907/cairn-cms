# Act on newly published entries

When a post goes live, an organization often wants something to follow from it, such as an email
to subscribers or a message in a team channel. In cairn, publishing copies the entry onto the
site's default branch in one commit through the GitHub App, and that commit triggers the site's
existing deploy. The same commit patches the entry's row in the
[content manifest](architecture.md#the-publish-commit). The manifest is committed at
`src/content/.cairn/index.json` and lists every entry on the site. It changes only in a
default-branch commit that changes an entry, never when an editor saves work to a holding branch,
so the manifest a deploy builds from records the published site. The first publish that takes an
entry live stamps its row with `publishedAt`, and later saves leave that stamp unchanged. A stamp
therefore marks when a post went live and is never set by an edit. The manifests of two deploys
differ in exactly the stamps that landed between them, and `buildNewlyPublished` takes the earlier
and the later manifest and returns the entries that went live.

If your site has to send that email or message, you write a post-deploy job that finds the entries
a deploy newly published, hands them to your send code, and saves the manifest for the next run.
The job is a script that runs as a step after the deploy, outside the SvelteKit app. It imports
from `@glw907/cairn-cms/delivery/data`, a subpath that pulls in none of the engine's server code.
Other sites want an editor to take a next step at the moment of publishing, such as opening an
announcement screen the site provides. The adapter meets that need with next-step links that the
admin shows beside the publish-success strip, and
[Add a next-step link after publish](#add-a-next-step-link-after-publish) sets them up with no job
involved. The two mechanisms cover different publishes. The links appear only after an editor
publishes a single entry, while the job also sees every entry that **Publish all** lands.

The job expects a deploy pipeline that can run a TypeScript module with Node, storage your platform
offers for keeping a manifest between runs, and your email or messaging code. It needs no knowledge
of cairn beyond publishing from the admin. The next-step link also assumes you know your site's
adapter file and where its `editor` block sits. The [`defineAdapter`](../reference/core.md#defineadapter)
entry describes the adapter and its `editor` member. Two related jobs fall outside this page. Feeds,
for subscribers who pull new posts instead of being sent them, belong to "Build the public routes",
and the send itself belongs to your email or messaging provider.
