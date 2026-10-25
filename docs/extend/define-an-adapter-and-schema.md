# Define an adapter and schema

The engine reads everything a cairn site declares about itself from one object, the `defineAdapter`
call in the site's `cairn.config.ts`. The call requires four groups, which hold the site's concepts
(`content`), the GitHub repository its commits land on (`backend`), the sender of the sign-in email
(`email`), and the renderer (`rendering`), and it accepts five optional groups beside them. Because
the engine hard-codes no concept, directory, or field, the adapter is where a site defines its
content, and every route factory, admin screen, and delivery helper reads its behavior from it.
SvelteKit's adapter is a separate thing. A site sets it in the `sveltekit()` call in
`vite.config.ts`, and a scaffolded site uses `@sveltejs/adapter-cloudflare` there.

A concept is one key of the adapter's `content` map, declared with `defineConcept`, and adding one is
an edit to that map, not a change to the engine. Vite resolves an `import.meta.glob` pattern only
where it is written out literally at the call site, so the engine cannot glob a concept's directory
from the adapter. The site writes each concept's glob twice instead: once in its content module,
which passes the glob to `createSiteIndexes`, and once in the `content` option of the `cairnManifest`
plugin in `vite.config.ts`. Adding a kind of content is therefore one job across three files. In the
site's SvelteKit code, each declared field then reads with its declared type and no cast, because
`defineAdapter` narrows its return type to the site's concepts and fields. This guide takes you
through writing the `defineAdapter` call, adding a concept with its fields, address, and tag field,
adding field checks and options, and confirming that the declaration typechecks and builds.

On a scaffolded site, the adapter already declares the `posts`, `pages`, and `fragments` concepts, a
backend, and a sender, and you open it to add a kind of content or to change a concept's fields,
address, or tags. On a hand-built site with
[Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md), you open it to grow the tutorial's
minimal adapter. The steps use the scaffold's files, and each section names the hand-built site's
difference where one exists. A developer about to build a custom admin screen for another kind of
markdown content can declare a concept here instead. Once a site has a GitHub App and a sender domain
onboarded to Cloudflare Email Sending, the App's identity values and the sender address go in the
adapter. Beside the adapter, a site keeps a YAML site
config. It holds the tag vocabulary and refuses the adapter's groups, and the page shows which file
each setting belongs in.

The page assumes you know TypeScript literal types, Vite's `import.meta.glob`, and YAML. It also
assumes you know the content model, and [Content model](content-model.md) explains what a concept,
routing, and an entry's identity are. The page leaves the following topics to other pages:

- Reference fields, in [Link content with references](link-content-with-references.md).
- The `rendering` group, in [Write a markdown component](write-a-markdown-component.md).
- Roles and the access map, in [Restrict admin access](restrict-admin-access.md).
- The `editor` group's `navLayout`, in [Arrange the admin sidebar](arrange-the-admin-sidebar.md).
- The `media` group, in [Configure media](configure-media.md).
- The `aiPosture` group, in [Choose an AI posture](choose-an-ai-posture.md).

## Before you begin

Declaring an adapter takes a site with the engine installed and a working knowledge of the content
model. Before you start, have the following in place:

- An installed engine. A scaffolded site has one, and
  [Scaffolded site files](scaffolded-site-files.md) shows where its files sit. A hand-built site
  gets one from [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md).
- The content model, from [Content model](content-model.md).
- For the backend and sender section only, a registered GitHub App and Cloudflare Email Sending
  onboarded for the sender's domain.
  [Register the GitHub App](add-cairn-to-a-sveltekit-app.md#register-the-github-app) and
  [Add the Email Sending binding and name the origin](add-cairn-to-a-sveltekit-app.md#add-the-email-sending-binding-and-name-the-origin)
  cover both.

With the engine installed, open the adapter file.

## Start from the adapter file

A site's adapter file holds one `defineAdapter` call, which must declare `content`, `backend`,
`email`, and `rendering` and may add five optional groups. The four required groups hold the
following:

- `content`: the concepts, keyed by concept id.
- `backend`: the provider for the GitHub repository that commits land on, which `createGithubApp`
  builds.
- `email`: the sender config for the magic-link sign-in email.
- `rendering`: the `render` function, plus optional `islands`, covered in
  [Write a markdown component](write-a-markdown-component.md).

Each optional group is covered on another page:

- `media`, in [Configure media](configure-media.md).
- `roles` and `access`, in [Restrict admin access](restrict-admin-access.md).
- `aiPosture`, in [Choose an AI posture](choose-an-ai-posture.md).
- `editor`, in [Set the concept and editor options](#set-the-concept-and-editor-options) for
  `supportContact` and in [Arrange the admin sidebar](arrange-the-admin-sidebar.md) for `navLayout`.

On a scaffolded site, the adapter sits beside the two other files a concept touches, the content
module and the Vite config:

```text
src/
├── chassis/
│   └── content.ts
└── theme/
    └── cairn.config.ts
vite.config.ts
```

On the add-cairn tutorial's site, the adapter is `src/lib/cairn.config.ts` and the content module is
`src/lib/content.ts`, beside the same `vite.config.ts`. Other modules import the adapter as `cairn`:

<!-- snippet-check-skip: shows two alternative import lines, one per kind of site, that would collide in one module -->
```ts
// On a scaffolded site
import { cairn } from '#theme/cairn.config.js';

// On the add-cairn tutorial's site
import { cairn } from '#lib/cairn.config.js';
```

The scaffold's call declares three concepts and fills in each required group:

<!-- snippet-check-skip: abridges the scaffold's adapter, eliding its imports, fieldsets, and render setup -->
```ts
// src/theme/cairn.config.ts (abridged)
export const cairn = defineAdapter({
  content: {
    posts: defineConcept({
      dir: 'src/content/posts',
      label: 'Posts',
      singular: 'post',
      routing: 'feed',
      fields: defineFieldset({ /* title, date, topics, and more */ }),
    }),
    pages: defineConcept({ /* ... */ }),
    fragments: defineConcept({ /* ... */ }),
  },
  backend: createGithubApp({ /* owner, repo, branch, appId, installationId */ }),
  email: { from: 'cms@showcase.test' },
  rendering: {
    render: ({ body, resolve, resolveMedia, resolveFragment }) =>
      renderMarkdown(body, { resolve, resolveMedia: resolveMedia ?? publicMediaResolver, resolveFragment }),
    // components, icons, and islands
  },
  // media and editor
});
```

If the site has a GitHub App and an email sender, fill in the backend and the sender next;
otherwise, skip to [Add a concept](#add-a-concept).

## Set the backend identity and the email sender

If the site publishes through a GitHub App and sends sign-in email, set the `backend` and `email`
groups, neither of which holds a secret.

To set the backend and the sender, follow these steps:

1. In the adapter file, replace the values passed to `createGithubApp` with the repository's owner,
   name, and branch and the App's `appId` and `installationId`.

   [Register the GitHub App](add-cairn-to-a-sveltekit-app.md#register-the-github-app) shows where
   each value comes from, and the [`createGithubApp`](../reference/core.md#creategithubapp) entry
   lists the options.

2. In the adapter's `email` group, set `from` to the sender address, and add `replyTo` if replies go
   elsewhere.

The `owner`, `repo`, `appId`, and `installationId` values are not secret. The private key that signs
commits stays out of the adapter, and the Worker reads it from the secret `GITHUB_APP_PRIVATE_KEY_B64`
at request time. [Store the App's credentials](add-cairn-to-a-sveltekit-app.md#store-the-apps-credentials)
sets that secret, and [Rotate the GitHub App key](rotate-the-github-app-key.md) replaces it.

A send needs Cloudflare Email Sending onboarded for the sender's domain. For the onboarding, see
[Add the Email Sending binding and name the origin](add-cairn-to-a-sveltekit-app.md#add-the-email-sending-binding-and-name-the-origin).

Next, add a concept to the content map.

## Add a concept

A concept is a `defineConcept` call in the adapter's `content` map, plus its content glob registered
in two more files. Only two members are required: `dir`, the repo-relative directory of the
concept's markdown files, and `fields`, the concept's `defineFieldset` fieldset. Every other member
has a default.

The following table lists each member's default and where the member shows up:

| Member | Default | Where it shows up |
| --- | --- | --- |
| `dir` | None; required | The directory of the concept's markdown files |
| `fields` | None; required | The concept's form, its save-time validator, and its inferred type |
| `label` | The concept id with its first letter capitalized | The admin sidebar and the create button |
| `singular` | The value of `label` | The create button |
| `routing` | `'page'` | Whether entries get public pages, as [Routing](content-model.md#routing) explains |
| `permalink` | `/<id>/:slug`, or `/:slug` for `pages` | The public address, in [Set the permalink and date prefix](#set-the-permalink-and-date-prefix) |
| `datePrefix` | `'day'` | The filename's date, in [Set the permalink and date prefix](#set-the-permalink-and-date-prefix) |
| `summaryFields` | An empty list | The entry summary, in [Set the concept and editor options](#set-the-concept-and-editor-options) |

An omitted `singular` falls back to the plural `label`, so the create button reads **New Events**.
Setting `singular` gives the button **New event**. Neither `posts` nor `pages` is a reserved name. Two conveniences key on those
literal ids, though, and the default permalink and the onboarding checklist stop applying to a
renamed concept.

To add a concept, follow these steps:

1. In `src/theme/cairn.config.ts`, add an `events` entry to the `content` map:

   <!-- snippet-check-skip: one property of the adapter's content map, which the scaffold's call opens -->
   ```ts
   // src/theme/cairn.config.ts, inside the content map
   events: defineConcept({
     dir: 'src/content/events', // the directory of the concept's markdown files
     label: 'Events', // the sidebar entry
     singular: 'event', // the create button: New event
     routing: 'page',
     fields: defineFieldset({
       title: fields.text({ label: 'Title', required: true }),
       date: fields.date({ label: 'Date' }),
       location: fields.text({ label: 'Location' }),
     }),
   }),
   ```

2. In `src/chassis/content.ts`, glob the concept's files and pass the glob to `createSiteIndexes` as
   `events`:

   <!-- snippet-check-skip: continues the scaffold's content module, eliding its imports and the other globs -->
   ```ts
   // src/chassis/content.ts
   const eventsRaw = import.meta.glob('/src/content/events/*.md', {
     query: '?raw',
     import: 'default',
     eager: true,
   }) as Record<string, string>;

   const indexes = createSiteIndexes(cairn, siteConfig, {
     posts: postsRaw,
     pages: pagesRaw,
     fragments: fragmentsRaw,
     events: eventsRaw,
   });
   ```

   A lazy glob, or one without `?raw` and `import: 'default'`, makes the build throw
   `expected input to be a string or buffer`. If the content module doesn't pass a declared concept
   to `createSiteIndexes`, the build throws.

3. In `vite.config.ts`, add the same glob to the `cairnManifest` plugin's `content` option, which
   maps each concept id to its glob:

   <!-- snippet-check-skip: one entry of the plugins list in the scaffold's vite.config.ts -->
   ```ts
   // vite.config.ts on a scaffolded site, inside the plugins list
   cairnManifest({
     configModule: '/src/theme/cairn.config.ts',
     content: {
       posts: '/src/content/posts/*.md',
       pages: '/src/content/pages/*.md',
       fragments: '/src/content/fragments/*.md',
       events: '/src/content/events/*.md',
     },
     manifestPath: '/src/content/.cairn/index.json',
   }),
   ```

   > **Caution:** A concept missing from the plugin's `content` option gets no manifest rows, with no error and no build warning. The `index.json` check in [Verify the declaration](#verify-the-declaration) catches it: the file holds no row for the concept.

4. If the concept's directory already holds entries, in a terminal at the site's root, run
   `npx cairn-manifest`.

   The command reuses the plugin's options, so the manifest it writes matches what the build checks.
   A committed manifest that has drifted from the markdown fails the build.

5. If you ran `npx cairn-manifest`, commit `src/content/.cairn/index.json`.

On the add-cairn tutorial's site, the first two steps edit `src/lib/cairn.config.ts` and
`src/lib/content.ts` instead, and the plugin's `configModule` names that same adapter file.

With the concept declared, decide its public address.

## Set the permalink and date prefix

An omitted `permalink` gives a concept's entries the address `/<id>/:slug`, or `/:slug` for the
`pages` concept, and `datePrefix` sets the filename's date separately. A permalink follows these
rules:

- It starts with `/` and uses only the tokens `:slug`, `:year`, `:month`, and `:day`.
- A date token needs `routing` set to `'feed'`, and `:month` and `:day` render zero-padded.
- A date token needs a field named `date` of type `date`, which the engine makes required.

The `datePrefix` member takes `'year'`, `'month'`, or `'day'`, and defaults to `'day'`. It sets how
much of the date a filename starts with, whatever the permalink. For how a filename's date prefix
relates to the entry's slug, see [Entry identity](content-model.md#entry-identity).

To give the concept a dated address, follow these steps:

1. In the `events` declaration, set `routing` to `'feed'` and `permalink` to
   `'/events/:year/:slug'`.
2. In the same declaration, set `datePrefix` to `'year'`.

`defineConcept` checks `permalink`, `datePrefix`, and `routing` when the adapter module loads, so a
mistake throws before any save.

Next, mark the field that holds the concept's tags.

## Mark the tag field

A concept's tags come from the one top-level `multiselect` it marks `taxonomy: true`, and a second
marker throws at declaration.

To mark the events concept's tag field, follow this step:

- In the `events` fieldset, add a `tags` multiselect with `taxonomy: true`, in the shape the
  scaffold's `posts` concept uses:

  <!-- snippet-check-skip: one property of the events fieldset -->
  ```ts
  // cairn.config.ts, inside the events fieldset
  tags: fields.multiselect({ label: 'Tags', creatable: true, taxonomy: true }),
  ```

The content index reads the marked field's values as each entry's `ContentSummary.tags`, with no
fallback to a field named `tags`. A marker inside an `object` or `array` field throws as well. A
multiselect named `tags`, `freetags`, or `categories` with no field marked logs a
`content.field_unmarked` warning. For the fix, see
[`content.field_unmarked`](debug-your-site.md#contentfield_unmarked).

Editors manage the marked field's vocabulary on the admin's **Tags** screen. Each vocabulary entry
pairs a `value`, the lowercase hyphenated slug stored in frontmatter, with a display `label`. Once
the vocabulary holds an entry, a save can add only vocabulary values to the marked field. An entry
keeps any existing tags outside the vocabulary as orphans. With an empty vocabulary, the field stays
the open multiselect it was declared as. To list a concept's entries by tag on public pages, see
[Build the public routes](build-the-public-routes.md).

The vocabulary lives under the `vocabulary` key of the site-config file. The adapter's
`editor.siteConfigPath` names that file, and it defaults to `src/theme/site.config.yaml`. The
**Tags**, **Settings**, and menu editor screens all read and commit that one file.

To point the tutorial's adapter at its site config, follow this step:

- On the add-cairn tutorial's site, in `src/lib/cairn.config.ts`, set `editor.siteConfigPath` to
  `src/lib/site.config.yaml`.

The [`siteConfigPath`](../reference/core.md#siteconfigpath-adapter-editor-member) entry describes the
member.

Next, add custom checks to the fieldset.

## Add field checks

A fieldset's `behavior` table checks one field after that field's rules pass, and its `refine`
function checks the whole entry after every field passes.

A `behavior[field].validate(value, siblings)` function runs only for a field that passed its checks. It receives the coerced value and the raw frontmatter, and it returns an error string or
`null`. A `behavior` key that names an undeclared field throws at declaration. The
`refine(data, body)` function runs synchronously, and only when no field or behavior check failed.
It returns a field-keyed error map that fails the save, or nothing.

> **Caution:** The two hooks fail in opposite directions when they throw.
>
> A throwing `behavior.validate` is logged as `content.field_behavior_failed`, and the field counts as valid. A throwing `refine` is not caught, and it fails the save with a server error and aborts the build's content index.

A failed save shows one banner carrying only the first error message. Write a `refine` message as a
standalone sentence, such as "The end date can't be before the start date."

To add a field check and a cross-field check, follow these steps:

1. In the `events` fieldset, add an `endDate` field:

   <!-- snippet-check-skip: one property of the events fieldset -->
   ```ts
   // cairn.config.ts, inside the events fieldset
   endDate: fields.date({ label: 'End date' }),
   ```

2. In the same `defineFieldset` call, pass a second argument whose `refine` returns an `endDate`
   error when the end date is earlier than `date`:

   <!-- snippet-check-skip: the events concept's fields member, inside its defineConcept call -->
   ```ts
   // cairn.config.ts, the events fieldset
   fields: defineFieldset(
     {
       title: fields.text({ label: 'Title', required: true }),
       date: fields.date({ label: 'Date' }),
       location: fields.text({ label: 'Location' }),
       tags: fields.multiselect({ label: 'Tags', creatable: true, taxonomy: true }),
       endDate: fields.date({ label: 'End date' }),
     },
     {
       refine: (data) =>
         typeof data.date === 'string' &&
         typeof data.endDate === 'string' &&
         data.endDate < data.date
           ? { endDate: "The end date can't be before the start date." }
           : undefined,
     },
   ),
   ```

3. In the same second argument, add a `behavior` entry whose `validate` refuses an empty location.
   An empty optional field reaches `validate` as `undefined`, so test for a string:

   <!-- snippet-check-skip: one property of the events fieldset's second argument -->
   ```ts
   // cairn.config.ts, in the events fieldset's second argument, beside refine
   behavior: { location: { validate: (value) => (typeof value === 'string' ? null : 'Enter a location.') } },
   ```

The [`defineFieldset`](../reference/core.md#definefieldset) entry lists the fieldset's options, and
[Field types](../reference/core.md#field-types) lists each builder.

Next, read what a passing save writes.

## Normalized frontmatter

Code that reads an entry receives normalized frontmatter, so test an optional key for absence, never
for an empty string or `false`. The validator trims strings and omits empty optional fields,
unchecked booleans, and empty arrays and objects. A saved file therefore never holds `false`.
`InferFieldset` matches that shape: it types every field not declared `required: true` as optional.

Next, set the remaining options.

## Set the concept and editor options

Three more options shape what the site and the admin show, one each on the concept, an array field,
and the adapter's `editor` group. Set each one the site needs:

- In the `events` declaration, set `summaryFields: ['location']`.

  The content index copies each named key from the validated frontmatter onto the entry's
  `ContentSummary.fields`. A key the fieldset does not declare throws at composition, and an omitted
  `summaryFields` leaves `fields` empty.

- On an `array` field whose items are objects, set `itemLabel` to the key of the sub-field that
  summarizes a collapsed row.

  An empty value falls back to the field's label and the row number. An array of leaf items
  summarizes each row by its value and ignores `itemLabel`. Pass a sub-field key, not display
  text.

- In the adapter's `editor` group, set `supportContact` to the contact a stuck editor should reach.

  An explicit empty string passes through, and the Help home then shows no hand-off. The
  [`supportContact`](../reference/core.md#supportcontact-adapter-editor-member) entry gives the
  default for an unset member.

Before you build, check what the site config accepts.

## Keep adapter settings out of `site.config.yaml`

`parseSiteConfig` rejects an adapter group key in the site config, so `backend`, `email`,
`rendering`, `media`, `editor`, and `content` stay in the adapter. The rejection of an adapter group
names `cairn.config.ts` as the key's home, and the rejection of `content` says to move `permalink`
and `datePrefix` into `defineConcept`. The file must be a YAML mapping with a non-empty `siteName`.
It accepts only the following top-level keys:

- `siteName`
- `description`
- `author`
- `locale`
- `menus`
- `spellcheck`
- `tidy`
- `vocabulary`

Any other key is rejected with the known keys listed. US English is the only spellcheck dictionary
the engine ships, and a `spellcheck.dialect` set to anything else, or left unset, resolves to it
with no warning. The [`parseSiteConfig`](../reference/core.md#parsesiteconfig) entry has the full contract.

With the declaration written, confirm that it typechecks and builds.

## Verify the declaration

`npm run check` typechecks the declared fields, and `npm run build` runs the content index and the
manifest checks against them.

To verify the declaration, follow these steps:

1. In a terminal at the site's root, run `npm run check` and confirm that it reports no errors.

   On a scaffolded site, the script runs `svelte-kit sync` and then `svelte-check`. The tutorial's
   `sv create` project carries a `check` script as well.

2. In the same terminal, run `npm run build` and confirm that it completes.
3. If the concept has entries, in `src/content/.cairn/index.json`, confirm that a row names one of
   them.
4. Run the dev server, open `/admin`, and confirm that the sidebar lists **Events** and the create
   button reads **New event**.

   On a scaffolded site, `npm run dev` starts the dev server against the dev backend.

If a check fails, [Diagnose a failed check](#diagnose-a-failed-check) traces it to its cause.

## Diagnose a failed check

Each failure traces to one piece of the declaration: a field's type, a glob, the URL policy, the
manifest, or the tag marker. Work through the following causes in order:

1. `npm run check` reports a type error where the site reads a field.

   The code reads a key that the fieldset types differently, or reads an optional key as always
   present. See [Normalized frontmatter](#normalized-frontmatter).

2. The build throws `expected input to be a string or buffer`.

   The concept's glob is lazy or lacks `?raw` and `import: 'default'`. Fix the glob as the
   content-module step in [Add a concept](#add-a-concept) shows.

3. The build throws for a declared concept with no glob.

   The content module does not pass that concept to `createSiteIndexes`. Add it as the
   content-module step in [Add a concept](#add-a-concept) shows.

4. The build throws from `defineConcept` as the adapter module loads.

   The permalink, the date prefix, or the routing breaks a rule in
   [Set the permalink and date prefix](#set-the-permalink-and-date-prefix).

5. The build fails on a manifest that has drifted from the markdown.

   Run `npx cairn-manifest` and commit the result.
   [Resolve a content build failure](add-cairn-to-a-sveltekit-app.md#resolve-a-content-build-failure)
   covers the same case.

6. `index.json` has no row for the new concept's entries.

   The concept is missing from the plugin's `content` option. Add it as the `vite.config.ts` step
   in [Add a concept](#add-a-concept) shows.

7. The tag index reads empty, and `content.field_unmarked` appears in the logs.

   See [`content.field_unmarked`](debug-your-site.md#contentfield_unmarked) for the fix.

8. A save commits a value that a behavior check should have refused, and
   `content.field_behavior_failed` appears in the logs.

   See [`content.field_behavior_failed`](debug-your-site.md#contentfield_behavior_failed).

## See also

The following pages cover the pieces this page links to:

- [`defineAdapter`](../reference/core.md#defineadapter) and
  [`defineConcept`](../reference/core.md#defineconcept), the adapter's and a concept's members.
- [`fields`](../reference/core.md#fields-1) and
  [`defineFieldset`](../reference/core.md#definefieldset), the field builders and the fieldset's
  options.
- [`createSiteIndexes`](../reference/delivery-data.md#createsiteindexes) and the
  [`cairnManifest` options](../reference/vite.md#cairnmanifestoptions), the two glob registrations.
- [Content model](content-model.md), what a concept, routing, and an entry's identity are.
- [Build the public routes](build-the-public-routes.md), listing a concept's entries and tags on
  public pages.
- [Link content with references](link-content-with-references.md), reference fields.
- [Write a markdown component](write-a-markdown-component.md), the `rendering` group.
- [Configure media](configure-media.md), the `media` group.
- [Restrict admin access](restrict-admin-access.md), roles and the access map.
- [Arrange the admin sidebar](arrange-the-admin-sidebar.md), the `editor` group's `navLayout`.
