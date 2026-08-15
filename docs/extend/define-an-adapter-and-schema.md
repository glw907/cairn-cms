# Define an adapter and schema

**Contract:** declare what your site publishes, where it commits, and how it renders, the one
`cairn.config.ts` the engine consumes.

**Precondition:** cairn installed in a SvelteKit app, either from [Build a site by
hand](./build-a-site-by-hand.md) or [Add cairn to a SvelteKit app](./add-cairn-to-a-sveltekit-app.md).

Everything a site tells cairn about itself lives in one adapter, built with `defineAdapter`. Four
groups are required: `content` (your concepts), `backend` (where commits land), `email` (the
magic-link sender), and `rendering` (markdown to HTML). This page walks through those four.
`media`, `roles`, `access`, `aiPosture`, and `editor` are the remaining, all-optional members.
[Configure rendering](./configure-rendering.md) covers `rendering` in depth and touches `media`.
[Restrict admin access by role](./restrict-admin-access.md) covers `roles` and `access`, and
[Choose an AI posture](./choose-an-ai-posture.md) covers `aiPosture`. [Declare your own
concept](./declare-your-own-concept.md) covers a second concept and how concepts reference each
other.

## Declare a concept

A concept is one content type: a directory of markdown files sharing a fieldset.

```ts
import { defineAdapter, defineConcept, fieldset, fields } from '@glw907/cairn-cms';

const posts = defineConcept({
  dir: 'src/content/posts',
  label: 'Posts',
  singular: 'post',
  routing: 'feed',
  fields: fieldset({
    title: fields.text({ label: 'Title', required: true }),
    date: fields.date({ label: 'Date' }),
    description: fields.textarea({ label: 'Description' }),
    tags: fields.multiselect({ label: 'Tags', creatable: true, taxonomy: true }),
  }),
});
```

`dir` is the directory of markdown files this concept reads. `label` names it in the admin nav
and the create button ("New Posts"); always set `singular` too ("New post"), since it has no
default that reads naturally for a plural label. `routing` is one of three shorthands:
`'feed'` (dated, publicly routable, appears in feeds and the sitemap, like a blog post),
`'page'` (routable but undated, like a static page; the default when `routing` is omitted), or
`'embedded'` (never publicly routable, reachable only by another entry's reference or
`::include`, the shape [Fragments](./reuse-content-across-entries.md) use).

`fields` is a `fieldset` of `fields.*` descriptors. The full vocabulary
(`text`, `textarea`, `number`, `select`, `multiselect`, `url`, `email`, `date`, `datetime`,
`boolean`, `icon`, `image`, `reference`, plus the `object` and `array` containers) is
[Core](../reference/core.md#fields)'s Fields section; reach for it when you need a field type
this walkthrough doesn't show. `taxonomy: true` on a `multiselect` marks your tag field: declare
at most one per concept, and see [Manage your tag vocabulary](../editors/manage-your-tag-vocabulary.md)
for what happens once a site configures a shared tag list.

`defineConcept` validates at declaration, not at first save: a bad `permalink`, `datePrefix`, or
`routing` throws the moment the module loads, so a mistake here surfaces at build time, not in a
confused editor's save attempt.

### The URL policy

`routing: 'feed'` alone gives you a sane default permalink. To choose your own shape:

```ts
import { defineConcept, fieldset, fields } from '@glw907/cairn-cms';

const posts = defineConcept({
  dir: 'src/content/posts',
  routing: 'feed',
  permalink: '/:year/:month/:slug',
  datePrefix: 'month',
  fields: fieldset({
    title: fields.text({ label: 'Title', required: true }),
    date: fields.date({ label: 'Date' }),
  }),
});
```

A `permalink` that uses a date token (`:year`, `:month`, `:day`) requires a `date` field on the
concept; `defineConcept` throws at declaration if it's missing or the wrong type, and normalizes
it to `required: true` for you, since the permalink can't resolve without a value.
`datePrefix` sets how much of the date lands in the filename stem (`year`, `month`, or `day`
granularity); it's independent of the permalink shape, so a concept can carry a full date in its
frontmatter while only prefixing the filename with the year.

## Point at your GitHub repository

```ts
import { githubApp } from '@glw907/cairn-cms';

const backend = githubApp({
  owner: 'your-github-username',
  repo: 'your-repo',
  branch: 'main',
  appId: '123456',
  installationId: '78901234',
});
```

`owner`, `repo`, `appId`, and `installationId` are plain, non-secret identity; the private key
that actually signs commits stays out of this file entirely, read from the Worker secret
`GITHUB_APP_PRIVATE_KEY_B64` at request time. If you haven't created the App yet, [Add cairn to a
SvelteKit app](./add-cairn-to-a-sveltekit-app.md) walks through it.

## Set the magic-link sender

```ts
const email = { from: 'cms@your-domain.example' };
```

This is the address magic-link sign-in emails come from. It needs an onboarded Email Sending
subdomain on your Cloudflare zone before a real send works; [Before you start](../admin/before-you-start.md)
covers that cost if you haven't set it up yet.

## Assemble the adapter

```ts
// src/lib/cairn.config.ts
import { defineAdapter, defineConcept, defineRegistry, fieldset, fields, githubApp, createRenderer } from '@glw907/cairn-cms';

const registry = defineRegistry({ components: [] });
const { renderMarkdown } = createRenderer(registry);

export const cairn = defineAdapter({
  content: {
    posts: defineConcept({
      dir: 'src/content/posts',
      label: 'Posts',
      singular: 'post',
      routing: 'feed',
      fields: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Date' }),
        description: fields.textarea({ label: 'Description' }),
      }),
    }),
  },
  backend: githubApp({
    owner: 'your-github-username',
    repo: 'your-repo',
    branch: 'main',
    appId: '123456',
    installationId: '78901234',
  }),
  email: { from: 'cms@your-domain.example' },
  rendering: {
    render: ({ body, resolve, resolveMedia }) => renderMarkdown(body, { resolve, resolveMedia }),
    components: registry,
  },
});
```

`defineAdapter` narrows the return type to your concrete concepts and fields, so a read against
`cairn.content.posts` carries your declared field types all the way through, with no cast.

**You know it worked when:** the module loads with no throw (a bad URL policy or a malformed
component fails here, at import time), and `npm run check` typechecks against your declared
fields.

## Where to go next

- [Declare your own concept](./declare-your-own-concept.md) adds a second concept and connects
  it to the first with a `reference` field.
- [Configure rendering](./configure-rendering.md) registers your first markdown component,
  beyond the empty registry this page stubbed in.
- [Content model](./content-model.md) explains the concept model's own shape and constraints in
  depth, including the one-level nesting cap on `object` and `array` fields.
