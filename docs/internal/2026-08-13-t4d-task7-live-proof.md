# T4d Task 7: the console's live proof (2026-08-13)

The first live run of the localhost console over a real Workers Builds wait. T4d's Tasks 1
through 6 built and gated it against fakes; this run proves it against the real service, on the
estate T5 left standing. Evidence per claim is a raw read, either the console's own served bytes
or the Cloudflare API, never the tool's printed report.

## Preconditions

- **The engine under test is T4d's, not T5's.** `~/Projects/cairn-scratch/cli` holds the
  pre-T4d pack from the T5 sitting and would have proven the wrong code. The CLI was repacked
  from the `t5-browser-door` worktree with `npm pack --ignore-scripts` and installed clean at
  `~/Projects/cairn-scratch/cli-t4d`; `src/console/`, `src/hold-loop.mjs`, and
  `src/loopback-core.mjs` were confirmed present in both the tarball and the installed tree.
  The skipped bake leaves whatever `template/` was already on disk in the tarball, which is
  irrelevant here: a `--connect` re-entry scaffolds nothing.
- **The estate re-verified at execution start.** `~/.config/cairn/sites/` held one record,
  `t5-scratch-a32510.json`, at `builds-live`. Its `buildsReconciledHash` matched the site's
  current on-disk hash exactly (`936559a0…`, computed through the installed module's own
  `reconciledConfigHash`), so a local edit was a genuine drift rather than a no-op.
- **Two stray records removed first.** `console-hold-dbgtst.json` and `console-hold-parkpa.json`
  were sitting in the real state directory, left by ad-hoc debug probes during the build pass.
  The committed suite was cleared of suspicion before they were deleted: `test/console-hold.test.mjs`
  ran to 4 pass with the directory watched before and after, and wrote nothing. Probe debris, not
  a shipped defect.

## The provocation

A local edit to `src/theme/cairn.config.ts`, one of the two files in `RECONCILED_FILES`. The
`builds-live` re-entry gates on the LOCAL reconcile hash, so neither a push nor a kick can open
it; only local drift can. Three provocations ran, each appending a comment and re-entering with
`--connect`. Runs 5 and 6 were instrumented badly (below); run 7 is the clean one and is the
proof.

## Run 7, the clean pass (2026-08-13 23:29:50 to 23:30:56 local, exit 0)

Transcript `~/Projects/cairn-scratch/t4d-task7/run7.flat`; console samples in `samples7/`.

- **Hop: reconcile, with the reauthorize trip live.** The hash drifted
  (`936559a0…` to a fresh value), so `performReconcile` ran the OAuth trip rather than skipping
  it. On an already-authorized browser session GitHub redirected with no click, the same as T5's
  run 3. Raw read: commit `4c54b2f0dbbe`, message "Reconcile deploy config from
  create-cairn-site", author and committer both "Geoffrey L. Wright", and exactly one file
  changed, `src/theme/cairn.config.ts`.
- **Hop: the fresh token.** Reaching `builds-live` had deleted the saved token at that terminal
  step, so the eight-key prefill opened and the chapter asked for a paste, exactly as the branch's
  own copy says it will.
- **Hop: the held build watch, with the console up.** The printed line, verbatim:

  ```
  Watch progress at http://127.0.0.1:37089/-oFnDgfin_BGtGnlw9p6Tg (this page is served only while this run is going).
  Still watching the build; checking every few seconds. Leave this running.
  ```

- **The re-render across the state change, from one console.** The console was sampled every
  three seconds for the life of the hold: 19 samples, all from that one URL.

  | Samples | Title | Status | `meta refresh` |
  |---|---|---|---|
  | s001 to s002 | Watching your build | initializing | 5 |
  | s003 to s018 | Watching your build | running | 5 |
  | s019 | Cleared | (exit render) | absent |

  The build class's ~5s display cadence is in every live page's refresh value, and the exit
  render deliberately carries none, which is what the module's own header says it is for.
- **Auto-resume.** No input reached the process after the token paste. The hold cleared on its
  own, the console stopped answering, and the run continued into the completion message and
  exited 0.
- **The raw read that matches.** The console rendered
  `Build: f85573dc-2fa8-4d82-88f0-ae1d57c0d698`, `Commit:
  4c54b2f0dbbe5e0741d890d4631097a1dadfc2f6`. `GET
  /accounts/{id}/builds/workers/548f8458…/builds` independently returns the same build_uuid on the
  same commit, `build_trigger_source: "push_event"` (the reconcile push triggered it; no kick),
  `status: stopped`, `build_outcome: success`, created `07:29:59.625Z`, modified `07:30:50.819Z`.
  The hold spanned that whole 51-second build. `https://carin-test.org/` answers 200 `text/html`.

## The hold spans the build, verified three times

This is the defect the pass's own fix round closed ("Hold the Builds console across the build,
not just its discovery"), so it is worth stating from live timings rather than from the test.
Every run's console served from before the build settled until after, and every run exited within
seconds of its build's settle time:

| Run | Commit | Build | Build settled | Run exited |
|---|---|---|---|---|
| 5 | `4a19adc11878` | `56694d78…` | 07:26:21.932Z | 23:26:28 local |
| 6 | `488a9216cb2a` | `861f7a46…` | 07:28:53.590Z | 23:28:56 local |
| 7 | `4c54b2f0dbbe` | `f85573dc…` | 07:30:50.819Z | 23:30:56 local |

## Harness findings, none of them defects in cairn

Three mechanical faults cost two runs, all in the driving harness rather than the tool. They are
recorded because the next agent-driven live run will hit the same three.

1. **`script` buffers its typescript.** A feeder watching the transcript for the paste prompt
   never fires, because the file lags the terminal. `script -f` flushes per write and fixes it;
   without it, run 5 and run 6 both had to be answered by hand on the fifo.
2. **A pty with no window size wraps one character per line.** `script` gives the pty no size when
   stdin is a fifo and stdout is redirected, so clack's prompt renders one character per line and
   no plain grep matches it. Setting `COLUMNS`/`LINES` and running `stty cols`/`rows` inside the
   command fixes the transcript; flattening (`tr -d '\r\n'` then stripping ANSI) fixes the match.
3. **Two samplers writing the same filenames.** Run 6's captures were destroyed by a second
   sampler's cleanup branch removing what the first had written. One sampler per run.

The token itself arrived damaged twice, which is worth knowing for any future file handoff: once
as the literal placeholder from the instructions, and once wrapped in bracketed-paste markers
(`ESC [ 200~ … ~`). Extracting the longest `[A-Za-z0-9_-]` run recovered a 53-character token
that `POST /user/tokens/verify` accepted, the same length T5's run 2 recorded.

## Method notes for the next live proof

The hold gate reads `stdout.isTTY`, so an agent-driven run must allocate a pty; `script` does it,
and T5's own runs 3 and 4 used the same idiom. The one interactive input on the `builds-live`
re-entry path is the token paste: `ensureAccountId` returns immediately from the saved account id,
and nothing else prompts. Answering a clack `password` prompt from a pipe needs all three of a
pty, a write that lands after the prompt attaches, and a writer that stays open afterwards, since
the prompt reads EOF as a cancel. All three were rehearsed against a standalone clack prompt
before the live run rather than discovered during it.
