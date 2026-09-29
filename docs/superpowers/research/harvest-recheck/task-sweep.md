# Harvest recheck: cut sweep over admin, editors, and the front door

One line per item, per rule 4 of `docs/superpowers/research/2026-09-29-harvest-theme-lineage-brief.md`.
Resolution column is filled by task 6b. No claim re-disposed in this sweep maps to a fact, and no
fact it filed depends, on a rule-3 rule count, scope default, the `./components` subpath, or a
chassis token. The lines below are two new bullets whose `Source:` cites a path under
`src/lib/components/`, and one frozen bullet that needs a change.

- `f:pzct1u` (new bullet, `editors.md`, write-in-the-editor): Source cites `src/lib/components/EditPage.svelte:952-955` and `:980-986`; repoint to `src/lib/admin/EditPage.svelte` and re-check both ranges. Resolution:
- `f:5jbaej` (new bullet, `front-door.md`, why-cairn): Source cites `src/lib/components/CairnMediaLibrary.svelte:1087-1097,1206-1210` and `src/lib/components/media-library-helpers.ts:41-43`; repoint to `src/lib/admin/` and re-check the lines. Resolution:
- `f:pgv0o5` (frozen, `editors.md:18`, welcome): the claim is false. `src/lib/sveltekit/content-routes-shell.ts:301-315` renders the welcome view only for a role that resolves to `none` capability with no declared `home`, which includes a role absent from the site's vocabulary (`src/lib/auth/roles.ts:83-87`); an editor-capability role that reaches no concept gets `error(404, 'No content types configured')` at line 312 instead. Restate it to the none-capability condition per `f:puvoky`, or retag it `[rejected]`. Its Source also cites `src/lib/components/CairnAdmin.svelte` and `src/lib/components/WelcomeView.svelte`, which need the rule-3 repoint to `src/lib/admin/`. `editors/welcome.json` (line 195, span 41-42) maps to `f:pgv0o5` and may need remapping to `f:puvoky` once this is resolved. Resolution:
