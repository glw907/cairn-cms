# The chassis-nav pass (pre-Topo)

Scope (Geoff, 2026-07-19): the two friction-derived ROADMAP items whose consumer is Topo, pulled
forward so the chassis carries them before Topo derives from it. Then a release (size derives at
the cut, see below). Small pass: two tasks plus close-out.

Branch: a `chassis-nav` worktree off `main`. Method: `cairn-implementer` per task, test-first,
full gate per task; main loop reviews each diff and runs the close-out ritual (`cairn-pass`).

## Verified baseline (2026-07-19, main at `eb99d238`)

The showcase already wires the admin half of nav: `cairn.config.ts:442` declares
`nav: { configPath: 'src/theme/site.config.yaml', menuName: 'primary', label: 'Navigation',
maxDepth: 2 }` and `navLayout` mounts `{ screen: 'nav' }`, so `/admin/nav` edits
`menus.primary` in `site.config.yaml` and commits through the normal pipeline. The missing half
is the PUBLIC chrome: `SiteHeader.svelte` (~line 54) hardcodes its nav array with a comment
telling the site owner to edit the list, so an editor's `/admin/nav` changes publish and then
silently do nothing to the rendered site. The engine's `parseSiteConfig`/`extractMenu` are
already public exports; no new engine surface is expected.

## Tasks

### T1 — Public chrome reads the declared menu

The showcase's public header nav renders from `site.config.yaml`'s `menus.primary` (parsed
through the engine's `parseSiteConfig`/`extractMenu`, honoring the same `maxDepth: 2` shape the
admin editor enforces), replacing the hardcoded array. Constraints and acceptance:

- Find how the public chrome already receives site-config data (the chassis parses
  `site.config.yaml` somewhere for the site name; follow that path rather than adding a second
  reader). The menu should be read at build/load time the way the rest of the config is, not
  fetched client-side.
- First reconcile content: make `site.config.yaml`'s `menus.primary` match what the header
  hardcodes today, so the swap is behavior-preserving and the visual baselines should NOT
  drift. If they drift anyway, the CI regen path is `gh workflow run e2e.yml --ref <branch>
  -f update_snapshots=true` (note: the bot's regen commit leaves the re-triggered PR runs in
  `action_required`; approve them with
  `gh api -X POST repos/glw907/cairn-cms/actions/runs/<id>/approve`).
- If the footer also carries a hardcoded copy of the same links, wire it from the same parsed
  menu; if its list is genuinely different content, leave it and say so.
- Update the hardcoded-array comment story: the owner now edits nav in `/admin/nav` (or the
  YAML); the guide `docs/guides/organize-your-admin-nav.md` and the theme docs may reference
  the old edit-the-component idiom — grep and repoint any such claim.
- Test: a component or e2e assertion that a menu entry added to `site.config.yaml` renders in
  the public header (the existing e2e chrome specs are the model; keep it one focused test).
- Remove the corresponding ROADMAP item ("wire the showcase nav to the engine's menus") in the
  same task or in T2's docs sweep.

### T2 — The arm-index coverage gate

A `check:*`-idiom script (`scripts/`, wired as an npm script and into `test.yml` beside the
other doc gates) that fails when a published docs page exists in an arm directory
(`docs/reference`, `docs/guides`, `docs/explanation`, `docs/tutorial`) but its arm index README
does not link it. The dead-link direction is already covered by `check:docs`; this gate covers
the missing-entry direction. Keep it lean: no prose analysis, no numeric-claim parsing (that
idea stays retired), just set difference with an explicit allowlist mechanism for deliberately
unindexed pages if any exist (state them in the script, loudly). Acceptance: the gate passes on
the current tree (fix any real coverage gap it finds rather than allowlisting it), fails when a
test page is added unindexed (prove once locally, then delete the probe), runs in CI. Remove
the ROADMAP Later item for the index-count gate.

## Close-out (the `cairn-pass` ritual, abbreviated for a small pass)

Simplifier over changed code; `npm run check` 0/0, `npm test` exit 0, `check:comments`; doc
gates (`check:reference`, `check:reference:signatures`, `check:package`, `check:docs`, plus the
new T2 gate); `check:surface` only if any engine surface moved (none expected);
`svelte-reviewer` over the chrome change; optical check of the public header under `vite dev`
read in the main loop (the header should look identical to before); CHANGELOG under
`## Unreleased`; push branch, PR, CI green (the worktree-showcase symlink gotcha means trust
CI's e2e, or fresh-install locally); merge; STATUS update on `main`.

## Release

Geoff authorized a release at pass end ("a minor cairn bump", 2026-07-19). Per the
`cairn-release` skill the size DERIVES AT THE CUT against the actual window: this plan adds no
new engine subsystem or public surface (template wiring plus a repo gate), so it will likely
derive as a patch again; if so, confirm the mismatch with Geoff in one sentence before cutting
(the 0.88.1 precedent: authorized as minor, derived and confirmed patch). Verify the number
free with `npm view @glw907/cairn-cms versions --json` at the cut.

## Post-mortem (2026-07-19, pass complete; PR #8 merged to main at c71cc454)

**Built.** T1: the showcase public header renders `menus.primary` through the engine's
`extractMenu`. A lean `src/theme/site-config.ts` owns the template's single `parseSiteConfig`
call (`cairn.config.ts` re-exports `siteConfig` from it), the ROOT layout server load returns
`nav` (root, not `(site)`, so the `+error.svelte` mount gets the same data), and `SiteHeader`
derives from `page.data.nav` typed app-wide via a new `App.PageData` declaration. Content was
reconciled first (the YAML now declares Writing/Styleguide/Admin, what the header had
hardcoded), so no visual drift; CI baselines held. The footer stays hardcoded deliberately: its
list (Writing/Admin/Feed) is different content. T2: `check:arm-indexes` (script + npm script +
`test.yml`), a set-difference gate per arm with the tutorial arm's index mapped to the front
door `docs/README.md`; allowlist empty. It caught one real orphan, `build-a-theme.md`, now
linked from the front door.

**Also shipped under the docs dimension.** Tutorial Milestone 7 rewritten off the client-side
adapter import onto the server-load shape the showcase now models (T1's own anti-pattern hunt
surfaced it); `docs/reference/core.md`'s `parseSiteConfig` example path repointed.

**Verified.** Full gate green locally (check 0/0 library and showcase, `npm test` exit 0 with
3775 passing, `check:comments`, `check:docs`, `check:arm-indexes` with red-probe evidence,
`check:reference(:signatures)`, `check:package`, `check:snippets`) and on CI (test, e2e, design,
scaffold all pass on PR #8; the CI e2e is the trusted consumer-build proof per the worktree
symlink gotcha). Focused e2e 2/2: config-to-render wiring plus the error-page nav contract.
Optical read of the rendered header at 1440 in the main loop: identical to before.

**Review.** `svelte-reviewer` (Opus): sound, no blockers; two suggestions applied
(`App.PageData`, the error-page e2e), one applied as a tutorial note (label-only nav nodes), one
declined with reasoning (the tutorial's two-line re-export survives `check:snippets`'s import
stubbing where `export ... from` would need a skip marker). Simplifier: one change accepted
(typing the empty allowlist per sibling-gate idiom, fixing a latent `Set<never>` inference).

**Decisions locked.** The tutorial arm's index is `docs/README.md` (encoded in the gate, by
design). The showcase's client/server config boundary now has three enforcing artifacts: the
lean-module split, the `App.PageData` typing, and the tutorial teaching the same shape.

**Follow-ups filed.** `guides/add-an-island.md` teaches a root-layout client import of the full
adapter (same anti-pattern family); friction-logged and filed in ROADMAP Next with the
registry-split fix shape named.

**Method note.** Two serial `cairn-implementer` dispatches (Sonnet), each gate-verified in the
main loop before the next; zero repair rounds. One process defect: a `pkill -f "vite preview"`
matched the orchestrating shell's own command line and killed it (exit 144) before the first
commit ran; killing by PID recovered it. Kill preview servers by PID, not by `-f` pattern.

**Release.** Authorized as "a minor bump"; derived as a patch at the cut (template wiring plus a
repo gate; no new engine subsystem or public surface) and Geoff confirmed `0.88.2`, the second
consecutive authorized-minor-derives-patch (the 0.88.1 precedent held).
