# Wiring core: design note

Slice `wiring-core`: pass 2 of the run sheet minus shape 8. Class `ordinary` plus `runner` for
`scripts/checks`. Initiative: `shared-standards`. It runs beside passes 1a and 1b and the slices
`field-values` and `tidy-lists`, each in its own worktree. Geoff approved the scope through
`design-audit/design.md` (packet 20261101T122027-138291, "Approve them all" on the wiring reshapes
and "Remove them all" on the options) and the run sheet (packet 20261101T125326-233255). The sheet's
"Moves the facts settled" line brings the five media options here.

## Outcome

A site writes less to wire rendering, content, and media, and the mistake that publishes `::include`
as literal text can no longer be written. A concept's location has one home. The admin takes the
adapter's rendering group as one prop. Rebuilt sites get the smaller wiring from the first release.

## What changes

| Item | Result |
|---|---|
| Shape 1 | `createRenderer({ components, remarkPlugins, rehypePlugins, resolveMedia, ... })` returns `render` and `renderDocument`, each taking one input object. `renderMarkdown` and the returned plugin arrays go. `Renderer` is a hand-written interface. The link resolver key is `resolveLink` on `SiteRender` and `ResolveOptions`. |
| Shape 2, #157 | `cairnManifest({ configModule })` and `createSiteResolver(cairn, files)` read one glob, bucketed by `concept.dir`. `manifestPath`, `siteFactsPath`, `content`, `validate: false`, and the unused site config parameter go. |
| Shape 3 | `createMediaResolver(media, manifest, { strict })`. `PublicRoutesConfig.resolveMedia` is a required `MediaResolve \| null`. `assetsEnabled`, `media.resolver_absent`, and the public `normalizeAssets` and `ResolvedAssetConfig` go. `AssetConfig` is `MediaConfig`, and `runtime.resolvedAssets` is `runtime.media`. |
| Five media options | `publicBase`, `urlForm`, `maxUploadBytes`, `allowedTypes`, and `transformations` go. The cap and type list become constants. `srcset`, `sizes`, and `transform-url.ts` go. `data.mediaBase` goes. |
| Shape 6 | `SiteResolver<A>` is typed by the adapter. `site.concept('posts')` is never undefined for a declared key. No reserved key. `paths()` replaces `entries()`. `SiteResolver.adjacent` goes. |
| #159 | `CairnAdmin` takes `rendering`, and `runtime.registry` goes. |
| Shape 19 | `defineAdapter` returns `A & Omit<CairnAdapter, keyof A>`, and the scaffold's cast goes. |
| Ergonomics 9 | `summaryFields` and `navLayout`'s `screen` keys are checked by `npm run check`. |
| Ergonomics 17 | The plugin returns `ssr.noExternal`, and the lines leave the template. |

## Calls made here

These fall inside the approved scope. The PR's `## Decisions` repeats them.

- **`media-base-context.ts` stays, a dependency the map missed.** The design says the file and its
  threading "go here too", and its "What was dropped" says the key "goes only with `publicBase`". But
  `ReproContext.svelte:245` reads `setContext(MEDIA_BASE_CONTEXT_KEY, resolvedMediaBase);` with a base of
  `'/repro-assets'`, and Geoff kept the reproductions, so every fixture thumbnail needs that context.
  What goes is the production half: `data.mediaBase` and the shell's `setContext`. A shell-hosted story
  then inherits `ReproContext`'s value with no shadow. #201 stays open for its home pass.
- **`SiteResolver.adjacent` goes instead of taking an id.** Shape 6 says "`adjacent` takes an id on
  both", but an id is unique only inside a concept, so a site-wide `adjacent(id)` can't name one entry.
  `composeEntryData` is the only reader, and no site calls it. It reads
  `site.concept(entry.concept)?.adjacent(entry.id)`, gated on `site.routable` so a fragment still gets
  no neighbors, as `byPath`'s gate gives it today.
- **`cairnManifest`'s `content` option goes too.** Shape 2 kept it as one glob string for a site with
  content outside `src/content`. All 11 concepts in the four sites sit under `src/content`, and
  `composeRuntime` already fixes the manifest there. Adding an option later is no break. So the root is
  the constant `src/content`, and the refusal names any `dir` outside it.
- **The glob stays `**`.** All 111 site files and the showcase's 30 sit one level under a concept, so
  the "file under no concept" throw reads no real site. The sheet's standing answer covers a measurable
  cost: T4 times the build and narrows the glob only on a real one.
- **`SiteResolver<A>` is a conditional alias over two interfaces.** A single generic interface fails
  variance. See the probe below.
- **`ResolvedMediaConfig` leaves the barrels and stays a recorded leak.** `CairnRuntime.media` still names
  it on `.` and `/sveltekit`, so `check-surface-leaks.json` records it as standing until shape 8 removes
  the member.
- **`runtime.assets` stays, retyped `MediaConfig`.** It has no reader, but its removal is shape 8. The
  same holds for `runtime.render` and `runtime.icons`.
- **Eval `s11-media-config` retires.** Its seam is `publicBase`, `urlForm`, `allowedTypes`, and
  `maxUploadBytes`, so nothing is left to grade. S07, S08, S14, and S15 follow the new names.
- **The `EntryData` stretch is set aside.** The sheet allows it, and it has no place in the estimate.
- **`audit-log-media-resolver-absent` needs no edit.** It left the live ledger before this pass. Only
  `runtime-publicmediaresolver`'s reopen line changes. Pass 1b's T1 writes the twelve rulings.
- **#201 is not folded.** The sweep offered it as dissolved, but the file stays, and the prompt keeps
  items outside the slice in their home pass.

## Probed

A throwaway `tsc` run at `d71e4401e`, against the real `ConceptConfig`, `defineConcept`, and
`defineFieldset`, proved each of these with a `@ts-expect-error` on the refused case.

- `string extends keyof A['content'] ? BaseSite : Typed<A>`, where `Typed<A>` declares
  `concept<K extends keyof A['content'] & string>(id: K)`, gives typed reads, refuses an undeclared id,
  assigns to the default `SiteResolver` as a value and as an argument, and leaves the default's
  `concept` returning `ContentIndex | undefined`.
- The one-interface form failed: `const wide: SiteResolver = site` raised TS2322 once the return type
  depended on `A`.
- `defineAdapter`'s intersection return keeps `cairn.aiPosture` readable, and per-concept typed reads
  survive it.
- `summaryFields` keys check through `defineConcept<const C>(concept: C & { summaryFields?: readonly
  (keyof C['fields']['fields'] & string)[] })`.
- `screen` keys check through `adapter: A & { editor?: { navLayout?: readonly Node<ScreenFor<A>>[] } }`,
  nested `children` included.

The `noExternal` merge is proved. A plugin's `config` result goes through `conf = mergeConfig(conf, res);`
(`node_modules/vite/dist/node/chunks/node.js:38121`, Vite 8.3.3), and `mergeConfigRecursively` at `:2883-2895`
keeps `true` and concatenates arrays:

```js
} else if (((key === "noExternal" || key === "external") && (rootPath === "ssr" || rootPath === "resolve") || key === "allowedHosts" && rootPath === "server") && (existing === true || value === true)) {
	merged[key] = true;
	continue;
}
...
if (Array.isArray(existing) || Array.isArray(value)) {
	merged[key] = [...arraify(existing), ...arraify(value)];
	continue;
}
```

A `resolveConfig` probe through a `config` hook confirmed it. A site's unset value, a list, a regex, and `true`
each land in both `ssr.noExternal` and `environments.ssr.resolve.noExternal` with the site's value kept.

Two things stay unproved, and each has the sheet's standing answer in the plan. The `**` glob's cost is read
at T4. Dropping the lines in a real install is proved only by `create-site`, since a linked-dependency showcase
cannot show the failure: `node.js:7168` reads `if (!configuredAsExternal && !isInNodeModules(resolved.id)) return
false;`, so a `file:../..` engine that resolves outside `node_modules` is never externalized.

## Out of scope

Shape 8, which waits for 1a (`cairn-admin.ts:115`, `runtime.sender`). Shape 4, 15, 16, and 17, which are
pass 4's. #134, which pass 4 drops; this slice removes its mechanism. The `EntryData` union.

## End-to-end check

CI's `e2e` on the PR head: the showcase builds through the new wiring, an `::include` renders through
the default `render`, a `media:` image resolves, and the template bake still carries
`TEMPLATE_GITHUB_APP_LITERAL`. CI's `create-site` on the head after T5 and T6 proves a packed install builds
and reaches `/admin` under `npm run dev` with no `noExternal` line.

## Risk class

`ordinary` plus `runner` (`check-options.mjs`, `check-surface-reexports.json`,
`check-self-use-allowlist.json`). The bake's literal does not move: `cairn.config.ts:160` keeps
`backend: createGithubApp({ owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId:
'2' }),` character for character, and no task edits that line, so no task takes `auth-data`.
