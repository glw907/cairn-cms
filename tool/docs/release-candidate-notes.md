# Verify the 1.0 release candidate

Release candidate verification is the conductor's work, not the owner's: this page is a checklist
for whoever builds and runs the candidate before the `tool/v1.0.0` tag, run in a real terminal
against the owner's own five production sites.

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

`adopt list` prints two groups. The Workers above the blank line carry a Custom Domain and
`cairn adopt --worker <name>` adopts each one. The Workers below it serve their site through a
Workers Route, which cairn does not provision and discovery therefore cannot read a domain from;
adopt one of those by naming its domain, `cairn adopt --worker <name> --domain <domain>`. Adopt
the five production sites, then confirm the registry holds them:

```sh
cairn sites list --json
```

## What to run, in this order

1. **The single-site body and the sweep's strip, in the real terminal, at its own width.** Run
   `cairn health <one site>` and bare `cairn health` against every registered site, not a captured
   frame. This settles the standing "real-terminal evidence" item by the conductor's own eyes:
   does either body read cleanly at the terminal's actual width?
2. **Both bodies at a narrow and a wide width.** Run each of the two again under `--width 60` and
   `--width 160`. Does the single-site body stay readable at 60, and does the strip use the extra
   room at 160 rather than stranding it?
3. **`--theme light` on a light background.** Switch the terminal to a light background and run
   `cairn health <one site> --theme light`. No golden can grade this; it needs a light background
   to look at. Is every row legible, and does the palette read as chosen rather than as washed
   out?
4. **A held check, and the exit code it produces.** Write an `--ack` entry for one failing check
   (`cairn health <site> --ack <check-id>=<a future date>`) and run it again. Does the held row
   read distinctly from a plain pass or fail, and does the run exit 1 (WARNING) rather than
   carrying the failure's own severity?
5. **`--quiet`, on an OK sweep and on a sweep that is not OK, at the terminal and through a
   pipe.** Run `cairn health --quiet` against a registry whose sites are all green: it writes
   nothing at all, and `echo $?` reports 0. Run it again piped (`cairn health --quiet | cat`),
   which is the shape a scheduler gives the process, and again after a real or induced failure,
   where it writes the same body it writes without the flag. Does silence on green read as
   confidence rather than as a hang?
6. **`cairn auth check`, with and without a site.** Run it bare: every zone-scoped and
   repository-scoped row reads `skip` and names `cairn auth check <site>` as the way to confirm
   it, and the run exits 1 (WARNING) because of those skips, even with all three credentials set
   and correct. Run it again naming one registered site: do those same rows read `pass` against
   the live token, and does the run exit 0? The Workers Observability row is no longer an
   exception: the telemetry query and its decoder were both wrong until 2026-09-21, and the row
   now settles on what the live route answers.
7. **`--json`, validated against the published schemas.** Run `cairn health <site> --json`, `cairn
   health --json`, and `cairn auth check --json`, and validate each payload against its schema in
   `docs/reference/schema/` (`cairn-health.schema.json`, `cairn-health-summary.schema.json`,
   `cairn-auth-check.schema.json`). Does every payload validate, and does each carry
   `schemaVersion`, `kind`, `verdict`, and `exitCode`?
8. **A usage error, exit 3 with empty stdout.** Run `cairn health --theme sideways` and pipe
   stdout to a file. Is the file empty, does the message go to stderr, and does `echo $?` report
   3?
9. **The honest-reading bar: a site with no genuine fault reads `OK`.** Run `cairn health <site>`
   against every registered site and read every `skip` and every `unknown` row. Each one has to be
   a fact about the site, not a gap in the tool: a credential the operator has not set, a Worker
   Workers Builds does not deploy, a record naming no repository. A row that names something the
   tool should have been able to read is a defect, and the tag waits on it. Then hold every
   genuine failure on the healthiest site with `--ack` and run it again: the verdict reads
   `WARNING` and the run exits 1, because a held failure is never `OK`. A site with no failure at
   all and no skipped row reads `OK` and exits 0.
10. **The launchd and Windows Task Scheduler wrappers, reasoned rather than executed.** Neither
   runs on this machine, so neither is executed here: read `docs/tripwire.md`'s launchd plist and
   Windows Task Scheduler sections and judge whether each is something a macOS or Windows
   operator could paste and adapt with no further cairn-specific knowledge. A "no" means the
   wrapper's own prose needs another pass, not that the schedule itself is broken.

## What a "no" would mean

- **Item 1 or 2 reads badly**: the render needs another pass before the tag. Say so and it holds.
- **Item 3 is illegible**: the light palette needs another pass; the tag waits on it.
- **Item 4's held row or exit code is wrong**: the hold arithmetic has a gap; the tag waits on a
  fix.
- **Item 5's silence or strip is wrong**: `--quiet`'s own rule has a gap; the tag waits on a fix.
- **Item 6 misreports a row**: the permission table or its probe has a real bug; the tag waits on
  a fix.
- **Item 7's payload fails its schema, or item 8 writes to stdout**: the machine contract is
  broken, which is the one thing a published tag cannot take back. The tag waits on a fix.
- **Item 9 shows a row that is the tool's own gap**: a healthy site cannot read `OK`, so every
  scheduled run exits non-zero forever. The tag waits on a fix.
- **Item 10's wrapper prose is unusable as written**: `docs/tripwire.md` gets one more edit before
  the tag.

A "yes" on all ten is what "go" for `tool/v1.0.0` means.

## What the live runs found

The 2026-09-21 run of this checklist against the owner's account found two defects no
fake-backed test could have caught, both now fixed and both recorded in `CHANGELOG.md`: the page
walk read a `result_info` field three of six live list routes do not send, and the Workers Logs
query body no longer matched the API's filter schema. The lasting change is a rule rather than
two patches. Every provider route the tool reads has a response recorded from a live call in
`packages/create-cairn-site/fixtures/cloudflare/`, with a test that decodes it, and a pass
touching a route records its response there in the same pass. A hand-written fixture proves only
that the code agrees with whoever wrote the fixture.

The second run, the same day, found the defect item 9 now exists for: all five sites carried three
or four rows that were the tool's own gaps rather than facts about the site, so no site could ever
read `OK` and every scheduled run would have exited 3. `CHANGELOG.md` lists each one. The lasting
change is item 9 itself: reading the verdict word is not enough, and every `skip` and `unknown` row
gets read for whose fault it names.
