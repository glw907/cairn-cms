# Verify the 1.0 release candidate

Release candidate verification is the conductor's work, not the owner's: this page is a checklist
for whoever builds and runs the candidate before the `tool/v1.0.0` tag, run in a real terminal
against the owner's own four production sites.

## Build it

From this commit, in `tool/`:

```sh
make install
```

That builds `cairn`, generates its man pages, and installs both to `~/.local/bin/cairn` and
`~/.local/share/man/man1/`. `cairn --version` should print a `-dirty` suffix if the tree has
uncommitted changes, and none if it doesn't.

## Point it at the registry

```sh
source ~/.local/secrets
cairn adopt list
```

Adopt the four production sites (`cairn adopt --worker <name>` for each one `adopt list` shows),
then confirm the registry holds them:

```sh
cairn sites list --json
```

## What to run, in this order

1. **The single-site body and the sweep's strip, in the real terminal, at its own width.** Run
   `cairn health <one site>` and bare `cairn health`, not a captured frame. This settles the
   standing "real-terminal evidence" item by the conductor's own eyes rather than by a captured
   frame: does either body read cleanly at the terminal's actual width?
2. **`cairn auth check`, against the real credentials.** Run it bare, then again naming one
   registered site (`cairn auth check <site>`). Bare, does every zone-scoped and
   repository-scoped row read `skip` and name `cairn auth check <site>` as the way to confirm it?
   Named, do those same rows read `pass` against a live token?
3. **`--theme light` on a light terminal.** No golden can grade this; it needs a light background
   to look at. **Not available in this candidate**: the `--theme` flag has not landed in this
   worktree as of this commit. Skip this item until a candidate built after it lands.
4. **A held check, and the exit code it produces.** Write an `--ack` entry for one check
   (`cairn health <site> --ack <check-id>=<a future date>`) and run the sweep again. Does the held
   row read distinctly from a plain pass or fail, and does the exit code reflect a hold rather
   than a fresh failure?
5. **`--quiet` on the sweep.** Run `cairn health --quiet` against a clean registry (silent) and
   again after a real or induced failure (the normal strip, not silence). Does silence on green
   read as confidence rather than as a hang?
6. **The launchd and Windows Task Scheduler wrappers, read rather than run.** Neither runs on this
   machine: read `docs/tripwire.md`'s launchd plist and Windows Task Scheduler sections and judge
   whether each is something a macOS or Windows operator could paste and adapt with no further
   cairn-specific knowledge. A "no" here means the wrapper's own prose needs another pass, not
   that the schedule itself is broken.

## What a "no" would mean

- **Item 1 reads badly**: the render needs another pass before the tag. Say so and it holds.
- **Item 2 misreports a row**: the permission table or its probe has a real bug; the tag waits on
  a fix.
- **Item 4's held row or exit code is wrong**: the hold arithmetic has a gap; the tag waits on a
  fix.
- **Item 5's silence or strip is wrong**: `--quiet`'s own rule has a gap; the tag waits on a fix.
- **Item 6's wrapper prose is unusable as written**: `docs/tripwire.md` gets one more edit before
  the tag.

A "yes" on every runnable item (1, 2, 4, 5, 6) is what "go" for `tool/v1.0.0` means; item 3 is
deferred to a candidate built after `--theme` lands.
