# xcathletes pass 3: consumer harvest

The xcathletes team platform (`~/Projects/xcathletes-org`) built its plans, schedule, and
broadcast pass against cairn 0.96.0 on 2026-08-22: two new embedded concepts (`plans` and
`events`) rendered at public URLs, a post-to-SMS broadcast fan-out keyed off a boolean
frontmatter field, a Twilio inbound webhook, and coach help pages. Eight findings. Five are
about declaring and consuming concepts; three are engine-level mechanics that the
workstation `CLAUDE.md` says belong to cairn rather than to any one site. The full text
with code citations is `xcathletes-org/docs/harvest-findings-pass-3.md`.

## Declaring and consuming concepts

**`fields.select` cannot source options from the site's own vocabulary.** The plans
concept's `team` field is a closed literal, `options: ['ECXC']`, because a select has no way
to read its options from a value the site already commits (a seeded table, a shared
vocabulary module). Every team the platform onboards is a hand-edit here with no
cross-check. A select that accepts a function returning options at build time, or reads a
named site-config array, keeps it in sync.

**`all()` returns bare summaries, forcing an `all()` plus `byId()` double lookup.**
`ContentIndex.all()` carries only `summaryFields` in `fields`, so a route that filters or
groups by ordinary typed frontmatter (`team`, `group`, `weekOf`) calls `byId(s.id)!` on every
summary to reach it: `n + 1` lookups to render one list, and a `!` that trusts an id from one
call resolves in the next. Nominating the fields as `summaryFields` trades away the typed
`ContentEntry<T>`. An `all()`-with-frontmatter option, or a bulk `byId` over `all()`'s own
output, closes it for the render-everything case.

**`routing: 'embedded'` gives an index and a lookup, but no route glue.** An embedded
concept stays off the sitemap and feed, which is right for plans and events, but its public
surface is then hand-written per concept: the `EntryGenerator`, the 404 on a missing slug,
the `composeEntryData` call. The second embedded concept in this pass repeated the same lines
with a different name. A `createEmbeddedRoutes` helper, parallel to `createPublicRoutes` but
skipping sitemap and feed registration, would be imported instead.

**Concept registration is a three-file toll with one silent arm.** A second start-to-finish
concept confirms what `declare-your-own-concept.md` already says: `cairn.config.ts`'s
`content` map, `createSiteIndexes`'s glob, and `cairnManifest`'s `content` option. The glob
omission throws at build; the manifest omission drops every row with no warning, so a
coach's published entries never reach the committed manifest and no gate catches it. The
concept's `dir` already carries the one fact both wirings need. Deriving the glob and the
manifest entry from the adapter's `content` map would collapse three files into one and turn
the silent drop into a build-time throw.

**`fields.multiselect` cannot pre-seed one option while staying `creatable`.** The plan's
first choice for marking a post as a broadcast was a reserved value in the open `topics`
taxonomy. `FieldInput.svelte`'s `isClosedMultiselect` makes the two modes exclusive at the
render layer: with `creatable: true` the editor draws a bare comma-separated text input and
never reads `options`, which the type system accepts silently. The site fell back to a
plain `announce` boolean. A closed-plus-creatable mode (known options as picks, a typed
addition beside them) is the shape most tagging UIs offer and would serve every future
reserved-value need.

## Engine-level mechanics

**Tailwind 4 preflight strips list semantics from every styled `<ul>`.** Any class on a
`<ul>` resets `list-style` to `none`, and Chrome and VoiceOver key "is this a list" off the
computed style, so the list reads as anonymous elements: no item count, no list navigation.
`role="list"` on the `<ul>` is the fix, and every styled list this pass shipped needed it by
hand, including three the review gate caught after the first round. A `.list` utility in
`chassis/tokens.css`, or a `cairn-audit` rule flagging a `<ul>` with a Tailwind class and no
`role="list"`, catches it at the source.

**`AdminTable`'s overflow wrapper is unreachable from the keyboard.** The
`toolkit-admin-table-wrap` div has `overflow-x: auto` and no `tabindex`, `role`, or
`aria-label`. On a narrow viewport it is the element that scrolls, and a keyboard-only coach
cannot reach it (WCAG 2.1.1, 1.4.10). Three attributes on the wrapper cairn owns:
`tabindex="0"`, `role="region"`, and an `aria-label` from the table's caption or a new prop.
A site cannot patch it without duplicating the wrapper.

**The `tokens.css` exclude list drops `collapse`, and a template reached for it anyway.**
`collapse` is on the DaisyUI exclude list, so `class="collapse collapse-arrow"` on
`/schedule`'s "Past" `<details>` compiled to nothing and sat inert until a screenshot read.
No build or type step flags a DaisyUI class that produced zero rules. A `cairn-audit` check
cross-referencing the exclude list against every `class` attribute in `.svelte` files, or a
grep of the compiled theme CSS for referenced classes with no rules, catches it before a
screenshot.
