# xcathletes pass 2: consumer harvest

The xcathletes team platform (`~/Projects/xcathletes-org`) built its training-log pass
against cairn 0.95.0 on 2026-08-20 and 2026-08-21: athlete-owned D1 tables, member
screens at `/log` and `/home`, a coach rollup under `/admin/training`, a push substrate,
and five public help pages. Five findings, three of them engine-level mechanics that the
workstation `CLAUDE.md` says belong to cairn rather than to any one site. The full text
with code citations and measurements is `xcathletes-org/docs/harvest-findings-pass-2.md`.

## Missing exports

**No same-origin helper for a non-admin route.** `svelte.config.js` disables SvelteKit's
`checkOrigin` so the admin guard can own CSRF for `/admin`, and that guard's origin check
covers only form content types. A consumer's second-audience member area therefore gets no
origin protection from either mechanism and has to write its own. xcathletes wrote
`requireSameOrigin(event)`: compare the `Origin` header to `event.url.origin`, throw 403
on mismatch or absence. The shape is generic enough that the next consumer writes the
same six lines. An `originMatches` or `requireSameOrigin` export from
`@glw907/cairn-cms/sveltekit`, beside `createD1AuditSink`, would close it.

**`TextInput`'s `type` prop omits `'date'`.** The prop forwards unchecked to the native
input at runtime, but the `.d.ts` narrows it to `'text' | 'search' | 'email' | 'url'`, so
`type="date"` fails `svelte-check` on a component that renders it fine. Widen the union
to include `date`, `tel`, and `number`, or type it as `string`.

## Engine-level mechanics

**The chassis space scale shadows Tailwind's container scale.** Tailwind 4 resolves
`max-w-<key>` against `--spacing-<key>` before `--container-<key>` when the theme defines
both. The chassis `@theme` defines `--spacing-3xs` through `--spacing-2xl`, so on every
chassis-descended site `max-w-2xl` compiles to `max-width: var(--spacing-2xl)`, about
65px. The colliding keys are exactly the ones both scales share: `3xs`, `2xs`, `xs`, `xl`,
`2xl`. `max-w-sm` and `max-w-md` escape because the space scale spells those `s` and `m`.
Six member screens collapsed to a 65px column at 390px, three of them shipped that way in
pass 1, and the full gate stayed green throughout. Declaring `--container-2xl` does not
override it (tested against a clean build). The site's fix was to size with
`max-w-measure`; the engine fix is either renaming the space scale or a `cairn-audit`
assertion that fails when a generated `max-w-*` rule resolves to a `--spacing-*` variable.
Upstream: tailwindlabs/tailwindcss issue 16463, discussion 17777.

**The DaisyUI allowlist has no check against the markup.** `src/chassis/tokens.css`
excludes every DaisyUI component but a hand-kept list. Pass 2 rendered `label`,
`select`, `textarea`, and `fieldset` unstyled in dev and production alike; pass 1's review
gate fixed the same failure with four other keys. The allowlist is right, since it keeps
roughly 50 dead families out of the sheet. What it lacks is a mechanical check that scans
the site's markup for DaisyUI class names and fails when one is excluded. That belongs in
`cairn-audit` beside the assertion above.

**`min-h-11` alone leaves text at the top of the box.** On a `<summary>` or any
non-flex element, the 44px floor sets only the height, so the ink sits on the first line
with all the padding below it (measured: 0px above, 26px below). `flex items-center` fixes
it. Two disclosures written a day apart by different tasks both hit it, which is the
recurrence signal. This is the always-right kind of mechanic, so any chassis class that
offers the tap-target floor should carry the centring with it.

**Three DaisyUI defaults fail contrast on every cairn site.** Measured at the pass 2
review gate: an unselected `.btn` has no visible edge against `base-100` or `base-200`
at `--depth: 0` (the invisible-edge mechanic already patched three times across cairn
sites), `input`, `select`, and `textarea` borders sit at 1.5:1 against their own
surface, and `.label` text renders at 4.22:1 in the light theme. The site patched all
three in `theme.css` (`btn-outline` on unselected pickers, `--input-color` at about 40%
of `base-content`, `.label` at about 75%). They are always-right mechanics, so the fix
belongs in the chassis theme defaults and as a `cairn-audit` contrast assertion over the
compiled sheet.
