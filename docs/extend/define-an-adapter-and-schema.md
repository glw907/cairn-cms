# Define an adapter and schema

A cairn site declares its content to the engine through one object: the [`defineAdapter`](../reference/core.md#defineadapter) call in the site's adapter module. The call holds the site's concepts under `content`. It also names the GitHub backend that receives commits, the sender of the sign-in email, and the renderer. A concept is one key in the `content` map, so a new kind of content starts as one more [`defineConcept`](../reference/core.md#defineconcept) call there.

The adapter alone does not make a concept's markdown files readable. Vite resolves an `import.meta.glob` pattern only where the pattern is written literally at the call site, so the engine cannot glob a concept's directory for the content module's call to [`createSiteIndexes`](../reference/delivery-data.md#createsiteindexes). The site writes each concept's glob in its content module, and the content module passes the glob to `createSiteIndexes`. The [`cairnManifest`](../reference/vite.md#cairnmanifest) Vite plugin checks the committed content manifest against the markdown, and the site writes the same pattern again in that plugin's `content` option. Adding a concept is therefore an edit to three files: the adapter module, the content module, and the Vite config.

The steps that follow add a concept and register its glob in both places. They then set the concept's public address, its tag field, the checks a save runs on its entries, and the options that shape its summaries, and they end by confirming that the site typechecks and builds with the new declaration.

A scaffolded site's adapter declares the `posts`, `pages`, and `fragments` concepts. A developer on such a site arrives when the site needs a kind of content that the adapter does not declare yet. Others arrive to change a declared concept's public address, its tag field, or the checks a save runs on its entries. A developer who installed the engine by hand arrives to grow a minimal adapter into a full declaration, starting from the `defineAdapter` call and the four groups it requires. The steps name each file by its role and give the scaffold's path for it, and a site built by hand applies the steps to its matching files. A reader whose build failed after a concept change, or whose new concept's entries are missing from the committed manifest, can start at [Resolve a failed check](#resolve-a-failed-check).

The page assumes you know TypeScript literal types, Vite's `import.meta.glob`, and YAML. It also assumes familiarity with the content model. [Content model](content-model.md) explains what a concept is, what routing decides, how an entry gets its id, and the normalized frontmatter a save writes. The page leaves the following topics to other pages:

- The `backend` and `email` groups, in [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md), with the backend's options in the [`createGithubApp`](../reference/core.md#creategithubapp) entry.
- The `rendering` group's `components` list, in [Write a markdown component](write-a-markdown-component.md).
- Reference fields, in [Reference fields](content-model.md#reference-fields) in Content model.
- The `roles` and `access` groups, in [Restrict admin access](restrict-admin-access.md).
- The `editor` group's `navLayout`, in [Arrange the admin sidebar](arrange-the-admin-sidebar.md).
- The `media` group, in [Configure media](configure-media.md).
- The `aiPosture` group, in [Choose an AI posture](choose-an-ai-posture.md).
- The keys the site config accepts, in the [`parseSiteConfig`](../reference/core.md#parsesiteconfig) entry.

## Before you begin

The steps assume the following:

- An installed engine. A scaffolded site has one, and a site built by hand installs one by following [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md).
- The content model: what a concept is, what its routing decides, and how an entry gets its id. See [Content model](content-model.md).

With both in place, open the adapter module.

## Start from the adapter module

The adapter module exports one `defineAdapter` call. The call accepts five optional groups: `roles`, `access`, `media`, `aiPosture`, and `editor`. It also requires the four groups that the following list describes:

- `content` holds the concepts, keyed by concept id.
- `backend` is the `createGithubApp` provider for the repository that receives commits.
- `email` names the sender of the sign-in email.
- `rendering` holds the `render` function.

A scaffolded site's call declares the `posts`, `pages`, and `fragments` concepts and fills in all four required groups. It also sets the optional `media` and `editor` groups. The scaffold keeps the adapter module at `src/theme/cairn.config.ts`, the content module at `src/chassis/content.ts`, and the Vite config at `vite.config.ts`. The following excerpt abridges the scaffold's call:

<!-- snippet-check-skip: abridges the scaffold's adapter, eliding its imports, fieldsets, and group values -->
```ts
// src/theme/cairn.config.ts (abridged)
export const cairn = defineAdapter({
  content: {
    posts: defineConcept({ /* dir, label, singular, summaryFields, routing, fields */ }),
    pages: defineConcept({ /* ... */ }),
    fragments: defineConcept({ /* ... */ }),
  },
  backend: createGithubApp({ /* owner, repo, branch, appId, installationId */ }),
  email: { from: 'cms@showcase.test' },
  rendering: { /* render, components, icons, islands */ },
  // media and editor
});
```

`defineAdapter` and `defineConcept` keep each concept's concrete fieldset type. The index that `createSiteIndexes` builds then types each entry's `frontmatter` from that fieldset, with no cast.

For the `backend` and `email` groups, see [Register the GitHub App](add-cairn-to-a-sveltekit-app.md#register-the-github-app). The [`createGithubApp`](../reference/core.md#creategithubapp) entry lists the backend's options, and the pages under [See also](#see-also) cover the other groups.

Next, add a concept to the `content` map.

## Add a concept

A concept requires two members: `dir`, the repo-relative directory of its markdown files, and `fields`, its `defineFieldset` fieldset. Every other member has a default.

The following table lists each optional member's default:

| Member | Default |
| --- | --- |
| `label` | The concept id with its first letter capitalized |
| `singular` | The value of `label` |
| `routing` | `'page'` |
| `permalink` | `/<id>/:slug`, or `/:slug` for `pages` |
| `datePrefix` | `'day'` |
| `summaryFields` | An empty list |

The `label` names the concept's sidebar entry, and the create button on the concept's list screen reads **New** followed by `singular`. A concept labeled `Posts` with no `singular` therefore gets the button **New Posts**.

The engine refuses some concept ids. A concept keyed `login`, `auth`, `editors`, `help`, `media`, `vocabulary`, `nav`, `settings`, or `site` throws an error. A concept keyed `fragments` must set `routing: 'embedded'`.

To add a concept, follow these steps:

1. In the adapter's `content` map, add a key named for the concept, with a `defineConcept` call as its value.

   The following entry is illustrative:

   <!-- snippet-check-skip: one property of the adapter's content map, which the scaffold's call opens -->
   ```ts
   // src/theme/cairn.config.ts, inside the content map
   events: defineConcept({
     dir: 'src/content/events',
     label: 'Events',
     singular: 'event',
     routing: 'page',
     fields: defineFieldset({
       title: fields.text({ label: 'Title', required: true }),
       date: fields.date({ label: 'Date' }),
       location: fields.text({ label: 'Location' }),
     }),
   }),
   ```

2. In the content module, glob the concept's directory with `query: '?raw'`, `import: 'default'`, and `eager: true`.
3. In the same module, pass the glob to `createSiteIndexes` under the concept's id.

   The following illustrative excerpt shows both steps:

   <!-- snippet-check-skip: continues the scaffold's content module, eliding its imports and the other globs -->
   ```ts
   // src/chassis/content.ts (excerpt)
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

   Once the directory holds entries, a lazy glob, or one without `import: 'default'`, hands the parser a function or a module object. The build then throws `expected input to be a string or buffer`. If the content module passes no glob for a declared concept, `createSiteIndexes` throws.

4. In the Vite config, add the concept's id and the same pattern to the `cairnManifest` plugin's `content` option.

   The following illustrative call adds the pattern:

   <!-- snippet-check-skip: one entry of the plugins list in the scaffold's vite.config.ts -->
   ```ts
   // vite.config.ts, inside the plugins list
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

   > **Caution:** A concept missing from the plugin's `content` option gets no rows in the manifest, and the build raises no error or warning for the omission. The manifest check in [Verify the declaration](#verify-the-declaration) catches it.

5. If the concept's directory already holds entries, in a terminal at the site's root, run [`npx cairn-manifest`](../reference/cli-cairn-manifest.md).

   The command reads the plugin's options from the Vite config, and it writes the manifest from the same globs the build checks. A committed manifest that has drifted from the markdown fails the build.

6. If you ran `npx cairn-manifest`, commit `src/content/.cairn/index.json`.

A scaffolded site's adapter declares a `navLayout` that does not name the new concept. The sidebar lists the concept in a trailing group after a divider until the layout places it. To place it, see [Arrange the admin sidebar](arrange-the-admin-sidebar.md).

With the concept registered, set its public address.

## Set the permalink and date prefix

An omitted `permalink` gives a concept's entries the address `/<id>/:slug`, or `/:slug` for the `pages` concept. A permalink follows these rules:

- It starts with `/`, and its tokens are `:slug`, `:year`, `:month`, and `:day`.
- A date token needs `routing: 'feed'`. The `:month` and `:day` tokens render zero-padded.
- A date token also needs a field named `date` of type `date`, and the engine makes that field required.

`datePrefix` takes `'year'`, `'month'`, or `'day'`, and defaults to `'day'`. It applies only to a `'feed'` concept. When an editor picks a date in the create dialog, `datePrefix` sets how much of that date prefixes the new entry's id. For how that prefix relates to an entry's slug, see [Entry identity](content-model.md#entry-identity).

To give a concept a dated address, follow these steps:

1. In the concept's declaration, set `routing` to `'feed'`.
2. In the same declaration, set `permalink` to a pattern with a date token, such as `'/:year/:slug'`.
3. Optional: In the same declaration, set `datePrefix` to `'year'` or `'month'`.

An invalid `permalink`, `datePrefix`, or `routing` makes `defineConcept` throw when the adapter module loads, before any save.

Next, mark the field that holds the concept's tags.

## Mark the tag field

A concept's tags come from the one top-level `multiselect` it marks `taxonomy: true`. A second marker, or one inside an `object` or `array`, throws when the fieldset is declared. The content index reads the marked field's values as each entry's `ContentSummary.tags`, with no fallback to a field named `tags`.

To mark the tag field, follow this step:

- In the concept's fieldset, add a `multiselect` with `taxonomy: true`, as the scaffold's `posts` concept does.

  The following property is illustrative:

  <!-- snippet-check-skip: one property of the events fieldset -->
  ```ts
  // src/theme/cairn.config.ts, inside the events fieldset
  tags: fields.multiselect({ label: 'Tags', creatable: true, taxonomy: true }),
  ```

In a concept that marks no field, a multiselect named `tags`, `freetags`, or `categories` makes the content index log a `content.field_unmarked` warning. For the fix, see [`content.field_unmarked`](debug-your-site.md#contentfield_unmarked).

Editors manage a tag vocabulary on the admin's **Tags** screen. Each vocabulary item pairs a lowercase hyphenated `value`, stored in frontmatter, with a display `label`. The vocabulary is one list for the site. Once the vocabulary holds an item, a save can add only vocabulary values to a concept's marked field. A content entry keeps its existing tags outside the vocabulary as orphans. With an empty vocabulary, the marked field stays the open multiselect it was declared as.

The vocabulary sits under the `vocabulary` key of the site config file. The adapter's `editor.siteConfigPath` names that file, and it defaults to `src/theme/site.config.yaml`. The [`siteConfigPath`](../reference/core.md#siteconfigpath-adapter-editor-member) entry describes the member, and the [`parseSiteConfig`](../reference/core.md#parsesiteconfig) entry lists the keys the file accepts.

With the tag field marked, add the checks a save runs on the concept's entries.

## Add field checks

A fieldset takes a second argument that holds two hooks. Each key in `behavior` checks one field, and `refine` checks the whole entry.

`behavior[field].validate(value, siblings)` runs only for a field that passed its built-in checks. It receives the coerced value and the raw frontmatter, and returns an error string or `null`. When an optional field is left empty, its `validate` still runs and receives `undefined`. A check that refuses an empty value therefore tests that the value is a string. A `behavior` key that names an undeclared field throws when the fieldset is declared.

`refine(data, body)` runs synchronously, and only after every field and behavior check passes. It returns either nothing or a map of field keys to messages. A returned map with at least one key fails the save, and an empty map passes.

> **Caution:** A throw has a different effect in each hook. A throwing `behavior.validate` is logged as `content.field_behavior_failed`, and the field counts as valid. A throwing `refine` is not caught. It fails the admin save with a server error, and it fails the build.

A refused save shows one banner holding only the first error message, and no message sits beside a field. Each message a check returns therefore needs to read as a standalone sentence.

To add both checks, follow these steps:

1. In the concept's `defineFieldset` call, pass a second argument after the field record.
2. In that argument, add the field's key under `behavior`, with a `validate` function that returns a message for a value the field must refuse.
3. In the same argument, add a `refine` function that returns a message keyed by field name when the fields it compares disagree.

   The following illustrative fieldset carries both hooks:

   <!-- snippet-check-skip: the events concept's fields member, inside its defineConcept call -->
   ```ts
   // src/theme/cairn.config.ts, the events concept's fields member
   fields: defineFieldset(
     {
       title: fields.text({ label: 'Title', required: true }),
       date: fields.date({ label: 'Date' }),
       endDate: fields.date({ label: 'End date' }),
       location: fields.text({ label: 'Location' }),
     },
     {
       behavior: {
         location: { validate: (value) => (typeof value === 'string' ? null : 'Enter a location.') },
       },
       refine: (data) =>
         typeof data.date === 'string' &&
         typeof data.endDate === 'string' &&
         data.endDate < data.date
           ? { endDate: "The end date can't be before the start date." }
           : undefined,
     },
   ),
   ```

The [`defineFieldset`](../reference/core.md#definefieldset) entry lists the fieldset's options. For the logged event, see [`content.field_behavior_failed`](debug-your-site.md#contentfield_behavior_failed).

With the checks in place, set the list summary and array row options.

## Set summary fields and row labels

Set each of the following options that the site needs:

- In the concept's declaration, set `summaryFields` to the frontmatter keys a list reads from each entry's summary, such as `['location']`.

  The content index copies each named key from the validated frontmatter onto the entry's `ContentSummary.fields`. A key the fieldset does not declare throws when `createSiteIndexes` or [`composeRuntime`](../reference/core.md#composeruntime) runs.

- On an `array` field whose items are objects, set `itemLabel` to the key of the sub-field that summarizes a collapsed row.

  When that sub-field is empty, the row shows the field's label and the row number. An array of leaf items summarizes each row by its value when that value is not an object, such as text. A row whose leaf value is an object, such as an image, shows the field's label and the row number. The following scaffold field sets `itemLabel` on an array of objects:

  <!-- snippet-check-skip: one property of the scaffold's posts fieldset -->
  ```ts
  // src/theme/cairn.config.ts, inside the posts fieldset
  faq: fields.array(
    fields.object({
      fields: {
        question: fields.text({ label: 'Question', required: true }),
        answer: fields.textarea({ label: 'Answer', required: true }),
      },
    }),
    { label: 'FAQ', itemLabel: 'question' },
  ),
  ```

With the declaration written, confirm that it typechecks and builds.

## Verify the declaration

The declaration is sound when `npm run check` and `npm run build` pass and the new concept appears in the manifest and the admin. To verify the declaration, follow these steps in order:

1. In a terminal at the site's root, run `npm run check`.

   On a scaffolded site the script runs `svelte-kit sync` and then `svelte-check`, which typechecks the code that reads the declared fields. An optional field left empty is absent from the saved frontmatter, and its inferred type is optional. Under the scaffold's strict settings, code that uses such a key's value where a defined value is required, without checking that it is set, fails this check.

2. In the output, confirm that `npm run check` reports no errors.
3. In the same terminal, run `npm run build`.
4. In the output, confirm that the build completes.
5. If the concept's directory holds entries, in `src/content/.cairn/index.json`, confirm that a row names one of the concept's entries.
6. In the same terminal, run `npm run dev`.

   The scaffold's script starts the dev server against an in-memory dev backend.

7. In a browser, open `/admin`.
8. In the sidebar, confirm that the concept's label appears.
9. In the sidebar, select the concept's label.
10. On the list screen, confirm that the create button reads **New** followed by the concept's `singular`.

If a check fails, find its symptom in [Resolve a failed check](#resolve-a-failed-check).

## Resolve a failed check

Each failure in the following list traces to a registration or a rule in the declaration. Under each failure, the list gives its cause and its fix:

- The build throws `expected input to be a string or buffer`.

  A concept's glob is lazy, or it lacks `import: 'default'`. In the content module, give the glob `query: '?raw'`, `import: 'default'`, and `eager: true`, as [Add a concept](#add-a-concept) shows.

- The build throws a `cairn: concept` error that says the concept has no glob passed.

  The content module does not pass that concept's glob to `createSiteIndexes`. In the content module, pass the glob under the concept's id.

- The adapter module throws a `cairn: concept` error about a permalink, a date prefix, or routing as it loads.

  The concept's `permalink`, `datePrefix`, or `routing` breaks a rule in [Set the permalink and date prefix](#set-the-permalink-and-date-prefix). Correct the member that the error message names.

- A `cairn: concept` error says that the id names an engine view under `/admin`, or that a concept cannot be named `site`.

  The concept's key in the `content` map is one of the ids the engine refuses. To give the concept another id, follow these steps:

  1. In the adapter's `content` map, rename the key.
  2. In the content module, rename the key passed to `createSiteIndexes`.
  3. In the Vite config, rename the key in the `cairnManifest` plugin's `content` option.

- The build fails with `content manifest is stale`.

  The committed manifest has drifted from the markdown on disk. To regenerate the manifest, follow these steps:

  1. In a terminal at the site's root, run `npx cairn-manifest`.
  2. Commit `src/content/.cairn/index.json`.

- After `npx cairn-manifest`, `index.json` holds no row for the new concept's entries.

  The concept is missing from the `cairnManifest` plugin's `content` option, its pattern there matches none of its files, or the concept's entries fail the fieldset's validation, since the manifest skips an entry that fails it. To add a missing concept to the plugin, follow these steps:

  1. In the Vite config, add the concept's id and pattern to the plugin's `content` option.
  2. In a terminal at the site's root, run `npx cairn-manifest` again.

  For an entry that fails validation, see the `invalid frontmatter field(s)` failure in [Diagnose a failed build](build-the-public-routes.md#diagnose-a-failed-build).

- The build logs `content.field_unmarked`, and the concept's entries carry no tags.

  The concept has a multiselect named like a tag field, and no field marked `taxonomy: true`. Add `taxonomy: true` to the concept's tag field.

- A save commits a value that a behavior check should have refused, and `content.field_behavior_failed` appears in the logs.

  The field's `behavior.validate` threw, and the engine counted the field as valid. See [`content.field_behavior_failed`](debug-your-site.md#contentfield_behavior_failed).

- A save fails with a server error whose cause is the error that `refine` threw, or the build fails with that error.

  The fieldset's `refine` function threw. Change `refine` to return an error map for the case it threw on.

For symptoms outside the declaration, see [Debug your site](debug-your-site.md).

## See also

The following reference entries describe the declaration's parts:

- [`defineAdapter`](../reference/core.md#defineadapter)
- [`defineConcept`](../reference/core.md#defineconcept)
- [`defineFieldset`](../reference/core.md#definefieldset)
- [Field types](../reference/core.md#field-types)
- [`createSiteIndexes`](../reference/delivery-data.md#createsiteindexes)
- [`CairnManifestOptions`](../reference/vite.md#cairnmanifestoptions)

The following pages cover the content model, the adapter's other groups, and the public routes:

- [Content model](content-model.md)
- [Write a markdown component](write-a-markdown-component.md)
- [Restrict admin access](restrict-admin-access.md)
- [Arrange the admin sidebar](arrange-the-admin-sidebar.md)
- [Configure media](configure-media.md)
- [Choose an AI posture](choose-an-ai-posture.md)
- [Build the public routes](build-the-public-routes.md)
