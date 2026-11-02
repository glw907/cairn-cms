# admin-rest design note

Slice of pass 5, class `ordinary`. Design estimate 190, ceiling 380. It ends pass 5: what `tidy-lists`
and `tool-gates` did not take, plus every item whose `Placement` says Pass 5. The plan is
`2026-11-01-admin-rest-plan.md`.

## Outcome

An editor's saved entry keeps every repeatable row. The rest of the pass's admin defects close, the
screens use the words Geoff ruled, the reproductions lose their outdoor-club names, and a site learns
about an uncopied migration or an unmapped route from a named message.

## Calls this note settles

Each is a routine call under the sheet's "A new product or taste question" row: reversible, recommended
reading taken, listed in the PR's `## Decisions`.

| Item | Call | Why |
|---|---|---|
| #237 | Keep each row's body mounted inside a bare `<div hidden={!expanded[row.id]}>` wrapper. | The body carries `flex flex-col`, and the admin sheet has no Preflight, so `hidden` on it does nothing (`EditPage.svelte:1731-1737`). A classless div takes the browser's `[hidden]` rule. A mounted body also fixes a second loss the sweep found: collapse and re-expand remounts from the seed and drops typed edits. |
| #237 | The `<li>` expands its row on a capture-phase `invalid`. | A required control left in a hidden row is unfocusable, so the browser cancels the save with no message. `EditPage.svelte:335-340` describes the same trap for the panes. |
| #190 | Do the reorder as the sheet asks: `requireEngineAccess` before the concept lookup, in `mintPreview` and `revokePreview`. | The sweep showed it narrows the probe, not closes it: an unmapped nonexistent id still answers `unknown-concept`, since `canReach` admits unmapped targets (`access.ts:198-199`), and every concept route gives the same signal as a 404. Closing it would change all of them, and no ruling says concept ids are secret from editors. The sheet and `design.md` name the fix, so it lands, with this limit in `## Decisions`. |
| #122 | Fold it here: `requireOrigin` moves ahead of `mintPreview`. | `design.md` "5. Admin and tidy" keeps #122's reorder while #115 and #116 drop. |
| #193 titles | Titles come from one manifest read inside the streamed `pendingEntries` promise, and a never-published entry falls back to its id. A failed manifest read falls back to ids too, since the branch list succeeded. | One subrequest, off the blocking path. Reading each pending branch's file would cost one subrequest per entry on every admin page, and humanizing the slug shows a guess, not a title. |
| #180 claim 3 | `Shown` becomes `All`. | The cheap truthful fix. The segment filters nothing. |
| #180 claim 4 | Remove the library's Describe and Decorative radios. The slide-over shows one Default alt text box, and blank reads as needs alt. | Decorative is a placement fact `MediaHeroField` owns, and the library has no stored flag. A stored flag would be a manifest change. `docs/editors/manage-the-media-library.md:76` already warns about the broken choice, so the fix also removes a caveat. |
| #173 | Rename every outdoor-club name in `src/lib/reproductions/`, using the plan's table. | The item says "outdoor-club names" and gives three examples. `cabin-porch` and `lake-sunrise` read as ordinary photos and stay. |
| #136 | `entry.delete_refused` and `entry.rename_refused` for a policy refusal, `entry.reference_check_failed` for a fail-closed read fault. | `src/lib/log/events.ts:10-14` reserves `refused` for policy and `failed` for a fault, and the item's reason field would otherwise mix the two. |
| Ergonomics 15 | The dev text fires when `event.locals.cairnBackend` is set, for `no_rule` only, and the admin error page shows it. | The audit says dev backend only and "reuse that helper", and that departs here: under `npm run dev` the flag reaches only `process.env` (`dev-gate.ts`), and a real site's `PUBLIC_ORIGIN` forces the deployed verdict on localhost (`handle.ts:155-157`), so the flag and `isDeployedHost` never fire. Only the dev handle sets `cairnBackend`, so no new marker is needed and `App.Locals` doesn't change. `dev-flag-strict-read` stands, with a line naming this, because the strict read is unchanged. `+error.svelte` replaces every 403 with fixed copy, so it needs one branch or the text never shows. `shadowed` keeps the generic text, since "add it" is the wrong fix there. |
| Ergonomics 19 | New condition `config.migrations-missing`, severity `warning`. It lists the package's migrations and requires each one outside a named opt-in set: `0001_roles`, `0002_audit`, `0003_preview`. | The check proves a file was copied, never that it was applied, and an adopted site may have folded a migration into another file name. The two existing conditions each name one file, so neither fits. `adopt-cairn.md:95-99` makes only `0000_auth` and `0004_login_nonce` required, and the template withholds `0002_audit`, so checking every file would warn on a fresh site. |
| #238 two invalid controls | `onFormInvalid` opens Details only for the first invalid control. | T1 makes this case easier to hit, the fix is one branch, and the browser focuses that same control. |

## Set aside for pass 7

ROADMAP's refused-action cluster (`ROADMAP.md:1867-1884`) names the create dialog's typed
title, slug, and date, and "no screen moving focus to the banner". Geoff took "the cluster fix in pass 7"
at the sheet's Brief, by one mechanism applied uniformly. So two halves are real dependencies the
dependency map missed, and each goes to pass 7:

- #180 claim 5, the refused new entry.
- #238's server-refusal half: focus on the refusal, `aria-invalid` from the server's answer.

#238's paste and trim half isn't a dependency. `maxlength` truncation is browser behavior, and the fix
wants a design, so it goes under the sheet's "A new product or taste question" row: set aside, listed in
`## Decisions`, and placed in pass 7 with the rest of that item.

## Later

File, don't build: `field.help` on a block attribute is unrendered at the same `ComponentForm.svelte`
lines as #143, and Discard and Rename have the same double-submit gap as #214.

## Out of scope

Everything `tool-gates` holds (#178, #75, #212, #213), `content-rest` holds (#179, #181, #199), or pass 3
holds (#103, E9's removal). #190's skill half stays in the cleanup round.

## End-to-end check

A post with two FAQ rows and a gallery image is saved, reloaded so every row is collapsed, saved again
after a title edit, and reloaded. Every row and value survives. The same Playwright test fails on the
old code, and the task records that failure.

## Risk class

`ordinary`. No changed path is on the `auth-data` map. `guard.ts` is off the map, and ergonomics 15 takes
the security read by judgment. If that read needs an `auth-data` path, the conductor merges with the
smoke, per the sheet.
