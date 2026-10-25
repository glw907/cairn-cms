---
page: Define an adapter and schema
type: task guide
---

# Define an adapter and schema

:::reader
**Who reads it.** A Svelte-fluent web developer building an organization's site on cairn, who has installed the engine, through the setup command or by hand, and has read Content model. They edit the site's adapter module, its content module, and its Vite config. :fact[2zytgf]

**Why they arrive:**
- The site needs a kind of content its adapter doesn't declare yet. A scaffolded site's adapter declares the `posts`, `pages`, and `fragments` concepts. Adding a concept touches the adapter, the content module, and the Vite config. :fact[u4cfvv] :fact[bheewf]
- They want to change a declared concept's public address, its tag field, or the checks a save runs on its entries. :fact[7ak73t] :fact[g9q627] :fact[93iwom]
- They built a site by hand and are growing its minimal adapter into a full declaration, starting from the `defineAdapter` call and its required groups. :fact[hkh101]
- A build failed after a concept change, or a new concept's entries are missing from the committed manifest, and they want the cause. :fact[n07oiu] :fact[7az6m2]

**What they already know.** TypeScript literal types, Vite's `import.meta.glob`, YAML, and the content model: what a concept is, what routing decides, and how an entry gets its id. The page explains none of these.

**Background.** The engine reads what a site declares about its content from one object, the `defineAdapter` call in the adapter module. A new concept is one more key in that object's `content` map. :fact[2zytgf] :fact[5eum60]
Vite resolves an `import.meta.glob` pattern only where it is written literally at the call site, and the engine therefore can't glob a concept's directory for the content module's call to `createSiteIndexes`. The site writes each concept's glob in its content module, which passes it to `createSiteIndexes`, and writes the same pattern again in the `cairnManifest` plugin's options. :fact[pdgkex] :fact[fj28xs]

**What the page does for them.** The introduction opens on the adapter as the one object that declares the site's content, and on why a new concept is registered in the content module and the Vite config as well as in the adapter. :fact[2zytgf] :fact[bheewf]
It states the task: add a concept and register its glob twice, then set its address, tag field, checks, and list options. The reader then confirms that the declaration typechecks and builds.
It then names each reader's reason, the prior knowledge above, and what the page leaves to other pages.

**What it leaves to other pages:**
- Content model covers concepts, routing, entry identity, and the normalized frontmatter a save writes.
- Add cairn to a SvelteKit app covers the `backend` and `email` groups, and the `createGithubApp` reference entry lists the backend's options.
- Write a markdown component covers the `rendering` group's `components` list.
- Link content with references covers reference fields.
- Restrict admin access covers the `roles` and `access` groups.
- Arrange the admin sidebar covers the `editor` group's `navLayout`.
- Configure media covers the `media` group.
- Choose an AI posture covers `aiPosture`.
- The `parseSiteConfig` reference entry covers the keys the site config accepts.
:::

:::constraints
- Name the adapter module, the content module, and the Vite config by their roles. Give `src/theme/cairn.config.ts`, `src/chassis/content.ts`, and `vite.config.ts` as where a scaffolded site keeps them, and give no path for any other site. :fact[7ym1ep] :fact[bheewf]
- Use an `events` concept as the running example in the snippets only, and frame each snippet as illustrative. The introduction and the section prose stay general to any concept.
- State each option's plain behavior by linking its reference entry, never by restating the reference's rows.
- Say nothing about the backend identity, the email sender, the editor group's `supportContact`, or the site config's other keys beyond the pointer each gets.
:::

## Before you begin

*Names what the steps assume, with a link to whatever produces each.*

- The steps assume the following:
- An installed engine. A scaffolded site has one, and a hand-built site installs one by following Add cairn to a SvelteKit app.
- See [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md).
- The content model: what a concept is, what its routing decides, and how an entry gets its id.
- See [Content model](content-model.md).

## Start from the adapter module

*Shows the `defineAdapter` call's groups and what the scaffold's call already declares, and hands the groups this page doesn't cover to their pages.*

- The adapter module exports one `defineAdapter` call. The call accepts five optional groups: `roles`, `access`, `media`, `aiPosture`, and `editor`. It also requires the four groups that the following list describes: :fact[hkh101] :fact[2zytgf]
- `content` holds the concepts, keyed by concept id. :fact[2zytgf]
- `backend` is the `createGithubApp` provider for the repository that receives commits. :fact[2zytgf]
- `email` names the sender of the sign-in email. :fact[2zytgf] :fact[z7lprs]
- `rendering` holds the `render` function. :fact[2zytgf]
- A scaffolded site's call declares the `posts`, `pages`, and `fragments` concepts, a `createGithubApp` backend, an `email` sender, and a `rendering` group, plus the optional `media` and `editor` groups. :fact[u4cfvv]
- Code: an abridged excerpt of the scaffold's `defineAdapter` call, captioned with its path, with each concept's body and the other groups' values elided. :source[/templates/waymark/src/theme/cairn.config.ts] :fact[u4cfvv]

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

- `defineAdapter` and `defineConcept` keep each concept's concrete fieldset type. The index that `createSiteIndexes` builds then types each entry's `frontmatter` from that fieldset, with no cast. :fact[68w9k9]
- Add cairn to a SvelteKit app covers the `backend` and `email` groups, and the `createGithubApp` reference entry lists the backend's options. The pages under [See also](#see-also) cover the other groups.
- See [Register the GitHub App](add-cairn-to-a-sveltekit-app.md#register-the-github-app).
- See [`createGithubApp`](../reference/core.md#creategithubapp).

## Add a concept

*Walks the reader through registering a new concept in the adapter, the content module, and the Vite config, ending with the manifest commit.*

- A concept requires two members: `dir`, the repo-relative directory of its markdown files, and `fields`, its `defineFieldset` fieldset. Every other member has a default. :fact[d27z58]
- A table, introduced by a sentence saying that it lists each optional member's default, gives one row each for `label` (the id with its first letter capitalized), `singular` (the `label`), `routing` (`'page'`), `permalink` (`/<id>/:slug`, or `/:slug` for `pages`), `datePrefix` (`'day'`), and `summaryFields` (an empty list). :fact[d27z58] :fact[g39nkp]
- The `label` names the concept's sidebar entry, and the create button on the concept's list screen reads **New** followed by `singular`. A concept labeled `Posts` with no `singular` therefore gets the button **New Posts**. :fact[gwmmkx]
- The engine refuses some ids. A concept keyed `login`, `auth`, `editors`, `help`, `media`, `vocabulary`, `nav`, `settings`, or `site` throws an error. A concept keyed `fragments` must set `routing: 'embedded'`. :fact[wr3hx3]
- To add a concept, follow these steps:
1. In the adapter's `content` map, add a key named for the concept, with a `defineConcept` call as its value. :fact[5eum60] :fact[d27z58]
- Code: an illustrative `events` key inside the scaffold's `content` map, with `dir`, `label`, `singular`, `routing: 'page'`, and a fieldset of a required `title`, a `date`, and a `location` text field. :source[/templates/waymark/src/theme/cairn.config.ts] :fact[d27z58] :fact[gwmmkx]

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

2. In the content module, glob the concept's directory with `query: '?raw'`, `import: 'default'`, and `eager: true`. :fact[n07oiu] :fact[bheewf]
3. In the same module, pass the glob to `createSiteIndexes` under the concept's id. :fact[bheewf] :fact[pdgkex]
- Code: an illustrative excerpt of the scaffold's content module, adding an `eventsRaw` glob and an `events` key beside the scaffold's three. :source[/templates/waymark/src/chassis/content.ts] :fact[bheewf] :fact[n07oiu]

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

- Once the concept's directory holds entries, a lazy glob, or one without `import: 'default'`, hands the parser a function or a module object, and the build throws `expected input to be a string or buffer`. If the content module passes no glob for a declared concept, `createSiteIndexes` throws. :fact[n07oiu] :fact[pdgkex]
4. In the Vite config, add the concept's id and the same pattern to the `cairnManifest` plugin's `content` option. :fact[fj28xs] :fact[bheewf]
- Code: an illustrative `cairnManifest` call from the scaffold's `vite.config.ts`, with `events` added to its `content` option. :source[/templates/waymark/vite.config.ts] :fact[bheewf]

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

- A caution notice says that a concept missing from the plugin's `content` option gets no rows in the manifest, and the build raises no error or warning for the omission. The manifest check in [Verify the declaration](#verify-the-declaration) catches it. :fact[7az6m2]
5. If the concept's directory already holds entries, in a terminal at the site's root, run `npx cairn-manifest`. :fact[fh6kod] :fact[6e8kwx]
- The command reads the plugin's options from the Vite config, and it writes the manifest from the same globs the build checks. A committed manifest that has drifted from the markdown fails the build. :fact[fh6kod] :fact[6e8kwx]
6. If step 5 regenerated the manifest, commit `src/content/.cairn/index.json`. :fact[bheewf] :fact[fdtgh5]
- A scaffolded site's adapter declares a `navLayout` that doesn't name the new concept. The sidebar lists the concept in a trailing group after a divider until the layout places it. :fact[tycp7k] :fact[yf1rrr]
- See [Arrange the admin sidebar](arrange-the-admin-sidebar.md).

## Set the permalink and date prefix

*Gives the permalink rules and the date prefix, then has the reader give a concept a dated address.*

- An omitted `permalink` gives a concept's entries the address `/<id>/:slug`, or `/:slug` for the `pages` concept. :fact[g39nkp]
- A permalink follows these rules:
- It starts with `/`, and its tokens are `:slug`, `:year`, `:month`, and `:day`. :fact[7ak73t]
- A date token needs `routing: 'feed'`. The `:month` and `:day` tokens render zero-padded. :fact[7ak73t]
- A date token also needs a field named `date` of type `date`, and the engine makes that field required. :fact[2i6u6o]
- `datePrefix` takes `'year'`, `'month'`, or `'day'`, and defaults to `'day'`. It applies only to a `'feed'` concept. When an editor picks a date in the create dialog, `datePrefix` sets how much of that date prefixes the new entry's id. :fact[cg1eo5]
- See [Entry identity](content-model.md#entry-identity).
- To give a concept a dated address, follow these steps:
1. In the concept's declaration, set `routing` to `'feed'`. :fact[7ak73t]
2. In the same declaration, set `permalink` to a pattern with a date token, such as `'/:year/:slug'`. :fact[7ak73t] :fact[2i6u6o]
3. Optional: In the same declaration, set `datePrefix` to `'year'` or `'month'`. :fact[cg1eo5]
- An invalid `permalink`, `datePrefix`, or `routing` makes `defineConcept` throw when the adapter module loads, before any save. :fact[lkgubp]

## Mark the tag field

*Has the reader mark the field that holds a concept's tags, and explains the site's vocabulary that a save then checks against.*

- A concept's tags come from the one top-level `multiselect` it marks `taxonomy: true`. A second marker, or one inside an `object` or `array`, throws when the fieldset is declared. :fact[g9q627] :fact[sz71ur]
- The content index reads the marked field's values as each entry's `ContentSummary.tags`, with no fallback to a field named `tags`. :fact[g9q627]
- To mark the tag field, follow this step:
- In the concept's fieldset, add a `multiselect` with `taxonomy: true`, as the scaffold's `posts` concept does. :fact[u4cfvv] :fact[g9q627]
- Code: one illustrative fieldset property, a creatable `tags` multiselect marked `taxonomy: true`. :source[/templates/waymark/src/theme/cairn.config.ts] :fact[g9q627]

<!-- snippet-check-skip: one property of the events fieldset -->
```ts
// src/theme/cairn.config.ts, inside the events fieldset
tags: fields.multiselect({ label: 'Tags', creatable: true, taxonomy: true }),
```

- In a concept that marks no field, a multiselect named `tags`, `freetags`, or `categories` makes the content index log a `content.field_unmarked` warning. :fact[lbeeak]
- See [`content.field_unmarked`](debug-your-site.md#contentfield_unmarked).
- Editors manage a tag vocabulary on the admin's **Tags** screen. Each vocabulary item pairs a lowercase hyphenated `value`, stored in frontmatter, with a display `label`. :fact[grvcbv] :fact[shv6wv] :fact[a6ez6i]
- The vocabulary is one list for the site. Once the vocabulary holds an item, a save can add only vocabulary values to a concept's marked field. :fact[xsms0b] :fact[2p519o]
- A content entry keeps its existing tags outside the vocabulary as orphans. With an empty vocabulary, the marked field stays the open multiselect it was declared as. :fact[2p519o] :fact[grvcbv]
- The vocabulary sits under the `vocabulary` key of the site config file. The adapter's `editor.siteConfigPath` names that file, and it defaults to `src/theme/site.config.yaml`. :fact[shv6wv]
- See [`siteConfigPath`](../reference/core.md#siteconfigpath-adapter-editor-member).
- See [`parseSiteConfig`](../reference/core.md#parsesiteconfig).

## Add field checks

*Has the reader add a per-field check and a cross-field check, and says how each hook fails when it throws.*

- A fieldset takes a second argument that holds two hooks. Each key in `behavior` checks one field, and `refine` checks the whole entry. :fact[93iwom]
- `behavior[field].validate(value, siblings)` runs only for a field that passed its built-in checks. It receives the coerced value and the raw frontmatter, and returns an error string or `null`. :fact[93iwom]
- When an optional field is left empty, its `validate` still runs and receives `undefined`. A check that refuses an empty value therefore tests that the value is a string. :fact[k7v2qe]
- A `behavior` key that names an undeclared field throws when the fieldset is declared. :fact[93iwom]
- `refine(data, body)` runs synchronously, and only after every field and behavior check passes. It returns either nothing or a map of field keys to messages. A returned map with at least one key fails the save, and an empty map passes. :fact[93iwom]
- A caution notice says that a throw has a different effect in each hook. A throwing `behavior.validate` is logged as `content.field_behavior_failed`, and the field counts as valid. :fact[93iwom]
- The notice continues: a throwing `refine` isn't caught. It fails the admin save with a server error, and it fails the build. :fact[ar5p72]
- A refused save shows one banner holding only the first error message, and no message sits beside a field. Each message a check returns therefore needs to read as a standalone sentence. :fact[aj5c4z]
- To add both checks, follow these steps:
1. In the concept's `defineFieldset` call, pass a second argument after the field record. :fact[93iwom]
2. In that argument, add the field's key under `behavior`, with a `validate` function that returns a message for a value the field must refuse. :fact[93iwom] :fact[k7v2qe]
3. In the same argument, add a `refine` function that returns a message keyed by field name when the fields it compares disagree. :fact[93iwom] :fact[aj5c4z]
- Code: an illustrative `events` fieldset with an `endDate` field, a `refine` that refuses an end date before `date`, and a `behavior` entry that refuses an empty location by testing for a string. :source[/src/lib/content/fieldset.ts#FieldsetConfig] :fact[93iwom] :fact[k7v2qe] :fact[aj5c4z]

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

- See [`defineFieldset`](../reference/core.md#definefieldset).
- See [`content.field_behavior_failed`](debug-your-site.md#contentfield_behavior_failed).

## Set summary fields and row labels

*Covers the two summary options: the frontmatter an entry's summary carries, and the label of a collapsed array row.*

- Set each of the following options that the site needs:
- In the concept's declaration, set `summaryFields` to the frontmatter keys a list reads from each entry's summary, such as `['location']`. :fact[9ro4u5]
- The content index copies each named key from the validated frontmatter onto the entry's `ContentSummary.fields`. A key the fieldset doesn't declare throws when `createSiteIndexes` or `composeRuntime` runs. :fact[9ro4u5]
- On an `array` field whose items are objects, set `itemLabel` to the key of the sub-field that summarizes a collapsed row. :fact[97c6g1]
- When that sub-field is empty, the row shows the field's label and the row number. An array of leaf items summarizes each row by its value when that value is not an object, such as text. A row whose leaf value is an object, such as an image, shows the field's label and the row number. :fact[97c6g1]
- Code: the scaffold's `faq` field, an array of objects whose `itemLabel` is `question`. :source[/templates/waymark/src/theme/cairn.config.ts] :fact[fe46lo]

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

## Verify the declaration

*Has the reader run the checks in order and see the new concept in the manifest and the admin.*

- To verify the declaration, follow these steps in order:
1. In a terminal at the site's root, run `npm run check`. :fact[a98mnn]
- On a scaffolded site the script runs `svelte-kit sync` and then `svelte-check`, which typechecks the code that reads the declared fields. :fact[a98mnn] :fact[68w9k9]
- An optional field left empty is absent from the saved frontmatter, and its inferred type is optional. Under the scaffold's strict settings, code that uses such a key's value where a defined value is required, without checking that it is set, fails this check. :fact[apoa3k] :fact[0cj6du]
2. In the output, confirm that `npm run check` reports no errors. :fact[a98mnn]
3. In the same terminal, run `npm run build`. :fact[a98mnn] :fact[yvz3mm]
4. In the output, confirm that the build completes. :fact[yvz3mm]
5. If the concept's directory holds entries, in `src/content/.cairn/index.json`, confirm that a row names one of the concept's entries. :fact[t5ebsr] :fact[7az6m2]
6. In the same terminal, run `npm run dev`. :fact[o47i0q]
- The scaffold's script starts the dev server against an in-memory dev backend. :fact[o47i0q]
7. In a browser, open `/admin`. :fact[gwmmkx]
8. In the sidebar, confirm that the concept's label appears. :fact[gwmmkx]
9. In the sidebar, select the concept's label. :fact[gwmmkx]
10. On the list screen, confirm that the create button reads **New** followed by the concept's `singular`. :fact[gwmmkx]

## Resolve a failed check

*Traces each failure to the registration or rule that causes it, and gives the fix.*

:::row
**Symptom.** The build throws `expected input to be a string or buffer`.
**Cause.** A concept's glob is lazy, or it lacks `import: 'default'`. :fact[n07oiu]
**Fix.** In the content module, give the glob `query: '?raw'`, `import: 'default'`, and `eager: true`, as [Add a concept](#add-a-concept) shows. :fact[n07oiu]
:::

:::row
**Symptom.** The build throws a `cairn: concept` error that says the concept has no glob passed.
**Cause.** The content module doesn't pass that concept's glob to `createSiteIndexes`. :fact[pdgkex]
**Fix.** In the content module, pass the glob under the concept's id, as [Add a concept](#add-a-concept) shows. :fact[pdgkex]
:::

:::row
**Symptom.** The adapter module throws a `cairn: concept` error about a permalink, a date prefix, or routing as it loads.
**Cause.** The concept's `permalink`, `datePrefix`, or `routing` breaks a rule in [Set the permalink and date prefix](#set-the-permalink-and-date-prefix). :fact[lkgubp] :fact[7ak73t]
**Fix.** Correct the member that the error message names. :fact[lkgubp]
:::

:::row
**Symptom.** A `cairn: concept` error says that the id names an engine view under `/admin`, or that a concept can't be named `site`.
**Cause.** The concept's key in the `content` map is one of the ids the engine refuses. :fact[wr3hx3]
**Fix.** To give the concept another id, follow these steps: :fact[wr3hx3] :fact[bheewf]
:::

1. In the adapter's `content` map, rename the key. :fact[wr3hx3]
2. In the content module, rename the key passed to `createSiteIndexes`. :fact[bheewf] :fact[pdgkex]
3. In the Vite config, rename the key in the `cairnManifest` plugin's `content` option. :fact[bheewf] :fact[fj28xs]

:::row
**Symptom.** The build fails with `content manifest is stale`.
**Cause.** The committed manifest has drifted from the markdown on disk. :fact[6e8kwx] :fact[fdtgh5]
**Fix.** To regenerate the manifest, follow these steps: :fact[fdtgh5] :fact[fh6kod]
:::

1. In a terminal at the site's root, run `npx cairn-manifest`. :fact[fdtgh5] :fact[fh6kod]
2. Commit `src/content/.cairn/index.json`. :fact[fdtgh5] :fact[fj28xs]

:::row
**Symptom.** After `npx cairn-manifest`, `index.json` holds no row for the new concept's entries.
**Cause.** The concept is missing from the `cairnManifest` plugin's `content` option, its pattern there matches none of its files, or the concept's entries fail the fieldset's validation, since the manifest skips an entry that fails it. :fact[7az6m2] :fact[0a254m]
**Fix.** To add a missing concept to the plugin, follow these steps: :fact[7az6m2] :fact[fh6kod]
:::

1. In the Vite config, add the concept's id and pattern to the plugin's `content` option. :fact[7az6m2] :fact[fj28xs]
2. In a terminal at the site's root, run `npx cairn-manifest` again. :fact[fdtgh5] :fact[fh6kod]
- For an entry that fails validation, see the `invalid frontmatter field(s)` failure in [Diagnose a failed build](build-the-public-routes.md#diagnose-a-failed-build). :fact[0a254m]

:::row
**Symptom.** The build logs `content.field_unmarked`, and the concept's entries carry no tags.
**Cause.** The concept has a multiselect named like a tag field, and no field marked `taxonomy: true`. :fact[lbeeak]
**Fix.** Add `taxonomy: true` to the concept's tag field. :fact[lbeeak]
:::

:::row
**Symptom.** A save commits a value that a behavior check should have refused, and `content.field_behavior_failed` appears in the logs.
**Cause.** The field's `behavior.validate` threw, and the engine counted the field as valid. :fact[93iwom]
**Fix.** See [`content.field_behavior_failed`](debug-your-site.md#contentfield_behavior_failed).
:::

:::row
**Symptom.** A save fails with a server error whose cause is the error that `refine` threw, or the build fails with that error.
**Cause.** The fieldset's `refine` function threw. :fact[ar5p72]
**Fix.** Change `refine` to return an error map for the case it threw on. :fact[ar5p72] :fact[93iwom]
:::

- See [Debug your site](debug-your-site.md).

## See also

*Points the reader to the reference entries behind the declaration and the pages that cover the adapter's other groups.*

- The following reference entries describe the declaration's parts:
- See [`defineAdapter`](../reference/core.md#defineadapter).
- See [`defineConcept`](../reference/core.md#defineconcept).
- See [`defineFieldset`](../reference/core.md#definefieldset).
- See [Field types](../reference/core.md#field-types).
- See [`createSiteIndexes`](../reference/delivery-data.md#createsiteindexes).
- See [`CairnManifestOptions`](../reference/vite.md#cairnmanifestoptions).
- The following pages cover the content model, the adapter's other groups, and the public routes:
- See [Content model](content-model.md).
- See [Write a markdown component](write-a-markdown-component.md).
- See [Link content with references](link-content-with-references.md).
- See [Restrict admin access](restrict-admin-access.md).
- See [Arrange the admin sidebar](arrange-the-admin-sidebar.md).
- See [Configure media](configure-media.md).
- See [Choose an AI posture](choose-an-ai-posture.md).
- See [Build the public routes](build-the-public-routes.md).
