# tool-fixes design note

Just-in-time note for a slice cut forward from run sheet pass 8. Initiative: none applies; the run is
recorded at `~/.local/state/cairn-agent-first/design-audit/`. A page or less, so no separate spec.

## Outcome

The fast lane catches the reds that cost this run CI, an implementer's lane report can be trusted, the
`createDialog` flake stops being the run's most common e2e retry, and the small gate items close.
Reading the transcripts changed three items: #252's cause is not the selection rule, #244 is not a
test or a cache defect, and #217 is already done.

## What the traces found

Each line was read at base `094fcf003`, or in the session logs under `~/.claude/projects/`.

**#252 is a short-circuit, not a selection miss.** `vitest related` picks `close-prebuilt.test.ts` on
T1's exact paths: running them selected it among five files (`close-prebuilt.test.ts`, 24 tests). T1's
implementer never reached that leg. Its three lanes ended `check:close: 3 check(s) failed` and then
`check:close: 1 check(s) failed: check:docs`, and line 1 joins the chain with `&&`
(`gate-tier.mjs:717`, `concurrently([...(chain.length > 0 ? [chain.join(' && ')] : []), ...parallel])`),
so a static red skips the unit leg. The last run was `npm run lane:fast ... 2>&1 | tail -4`, which
drops the exit code. So a static red hides a unit red, and the pipe hides the static red.

**#258 is a real gap.** `gate-tier.mjs:671` admits only `src` and `scripts` code paths to the unit leg,
so `package.json` and `examples/showcase/e2e/` never reach `check-leaks.test.ts:92` or
`gate-tier.test.ts:374`. Those tests read at run time, which no import graph sees.

**#244 is two implementers sharing `/tmp/lane.log`.** `agent-a3128a36b0dbfbe86` (pass 1a) ran
`npm run lane:fast ... >/tmp/lane.log` at 03:23:22 and `tail -c 1500 /tmp/lane.log` at 03:28:28.
`agent-a44abf19e72fe71b6` (`wiring-core`) wrote the same file from 03:23:30, and that is the
`cannot load .../agent-a44abf19e72fe71b6/dist/sveltekit/index.d.ts` the first implementer read. The
second agent had started two overlapping lanes (03:23:28 and 03:23:30), which is the rebuild race
`durable-gotchas.md` "Do not rebuild `dist` while `npm test` runs" names. It noticed and moved to
`/tmp/t3-lane-a44abf.log`. The test and every cache are innocent. The hook `claude-tail-guard`
suggests `cmd > /tmp/out.log`, which is how implementers learned the fixed name.

**#208: a pre-hydration click fits, and a probe can settle it.** The log reads the same in every run:
the click passes, then `14 × locator resolved to <dialog ...>` and `unexpected value "hidden"`. Of the
13 e2e runs from 06:21 to 07:34 UTC on 2026-11-02, 7 hit it at least once, 13 attempts in all, across
`golden-path`, `media-hero`, `preview`, `public-preview-tokens`, and `container-fields`.
`createDialog?.showModal()` hangs off an `onclick` (`ConceptList.svelte:317`),
which does nothing before hydration, and `durable-gotchas.md` already records the same race for a key
press: the markup shows about 130 ms before the listener attaches. The earlier "150 of 150 unloaded
clicks" measure is local, so it does not rule this out. T5 logs whether the button holds Svelte's
handler at click time (`events.js:287` reads `current_target[event_symbol]`), which settles it in CI
with no local browser.

## Decisions

- **Fast lane line 1 runs every leg and then fails.** This follows `close-prebuilt.mjs`, whose header
  says "one run reports every red check". Considered: reorder the unit leg first, which races the
  close runner's `dist` build.
- **The unit leg runs whole unless every path is selectable.** A new table key `unitSelectable` lists
  what stays on `vitest related`: `src/`, `docs/`, the root prose files, and the Vale files.
  Anything else, including a root file nobody listed, runs `npx vitest run --project unit`, which took
  52 s here on a loaded machine. It fails closed, as the classifier's header asks. The item's fix
  candidate maps two tests to three paths, and that map goes stale the same way the import graph
  already does. This also closes #166, since `check-skill-form.test.ts:84` holds the real tree.
- **`toolInputs` in the table selects the tool gate.** #241 asks for `events.ts`. The same table entry
  covers the other files the Go tests read outside `tool/`, from one grep, at no extra machinery.
- **#208's fix sits in the test.** `openCreateDialog` in `editor-helpers.ts` beside
  `fillTitleWhenHydrated`, re-clicking until the dialog opens. The dialog only opens once hydrated, so
  everything after it runs on a live page. Considered: `command="show-modal"` on the button, which
  moves the race to a pre-hydration `fill` and to an unset date (`ConceptList.svelte:223`, set in
  `$effect`); and `disabled` until hydrated, which flashes a grey button at every editor. A dead first
  click for a person inside that gap is not a defect worth new surface.
- **#253 aligns on Go's reading.** A CRLF line reads as its LF twin in both, and a body opening with
  NBSP counts as a body in both, because an odd line is safer owed than dropped.
- **#253's guidance half:** an entry whose `source("<base>")` resolves away from the repo root cannot
  scan `.claude`, so it stops counting as an entry.
- **`ci-green` check: left out.** `~/.local/bin/ci-green-lib.mjs:169-170` already prints "PR #N has merge
  conflicts with its base, so GitHub starts no pull_request workflows; resolve them and push." It
  lives in dotfiles, and no cairn-cms file owns it.

## Files and class

`ordinary` plus `runner`. No `auth-data` path: `scripts/checks/**`, `.github/**`, `.claude/**`, one
`src/lib/guidance` file, one Go reader, and e2e helpers. The end-to-end check is CI on the PR plus five
e2e runs on the fixed head with no `cairn-create-dialog-title` failure. At the base rate, 7 of 13, five
clean runs by chance is about 2 percent.

## Out of scope

Pass 8's other items. The `admin-visual` command palette and media-selected flakes stay filed on #208's
evidence. Caching the Playwright browser for #86. A `claude-tail-guard` change, which is dotfiles and
goes to the conductor as a list item.

## Estimate

Design 130, ceiling 260, plan path 115.
