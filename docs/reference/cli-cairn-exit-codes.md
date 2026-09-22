# The `cairn` CLI's exit codes

This page describes `cairn` 1.1.0, the release that adds `cairn doctor`; 1.0.1 is the current
release.

Every `cairn` command exits with one of four codes, following the Monitoring Plugins (Nagios)
convention. `cairn health`, `cairn doctor`, and `cairn auth check` decide theirs by the rules
below. `cairn sites list` exits 0 or 3 only: 3 when a site record cannot be read or an
`--expect-sites` count disagrees with the registry, and 0 otherwise, including on an empty
registry. Every other command exits 0 on success and 3 on any failure, including a usage error, a
cancelled run, and a tool fault.

## The four codes

| Code | Word |
| --- | --- |
| 0 | `OK` |
| 1 | `WARNING` |
| 2 | `CRITICAL` |
| 3 | `UNKNOWN` |

## Precedence

Several verdicts combine by precedence, not by numeric order:

```
CRITICAL > UNKNOWN > WARNING > OK
```

`UNKNOWN`'s 3 does not beat `CRITICAL`'s 2. The same order applies within one site's checks and
across a sweep of many sites' verdicts.

## What one check contributes

A check that ran reports `OK` when it passed and `CRITICAL` when it failed, with two exceptions:

- A check's own declared severity can rank its failure `WARNING` instead of `CRITICAL`. `engine`
  is the only health check at warning severity; every other check in the set fails at critical
  weight, and a check id with no declared severity is reported at full, critical weight.
- An unexpired hold softens a failure to `WARNING`, never to `OK`. A hold that has already expired
  contributes the same code an unheld failure does.

## When a check words its result `skip`

A check that could not run contributes `UNKNOWN`, with one exclusion. Three reason codes name a
check the run declined to attempt because the site's own setup gives it nothing to read, and
those three contribute `WARNING` instead.

- `reason.cred-missing`, a credential the operator never set.
- `reason.repo-not-recorded`, a site record naming no repository.
- `reason.api.builds-not-connected`, a Worker with no Workers Builds connection.

One fact decides both the wire word and the exit code together: the three reasons above word a
result `skip`, and every other unattempted or inconclusive check words it `unknown`. A hold never
softens an unknown; an operator can accept a known failure, never a check that never ran.

## A site with no checks at all

A site with no checks at all folds to `UNKNOWN`, never `OK`.

## Empty-registry rules

- `cairn sites list` on an empty registry reports zero sites and exits 0.
- An `--expect-sites` count that does not match the registry's own count exits 3.
- Bare `cairn health` on an empty registry exits 3.

## Holds

A hold is named either by a repeatable `--ack <check-id>=<YYYY-MM-DD>` flag on `cairn health` or
by an acknowledgement file. `--ack-file` names that file. With no `--ack-file`, the command reads
`acknowledgements.json` in the registry directory, and that default file's absence is not an
error. An `--ack-file` path that does not exist or cannot be read is a usage error, and exits 3.

## How a code is decided

An exit code is decided in one of two ways, by which kind of run produced it:

- A run that produced reports folds each site's verdict, any listing error, and the
  `--expect-sites` count into one code by the precedence above.
- A run that produced no report exits 3. A cancelled run, a usage error, and a tool fault each
  report `UNKNOWN`, because the checks did not run and the invocation says nothing about the
  site. `cairn auth check [<site>]` is the one exception: it folds one row per permission rather
  than a site report. A permission the run confirmed contributes `OK`, a permission it refuted
  contributes `CRITICAL`, a permission whose credential is missing contributes `WARNING` with
  `reason.cred-missing`, and a permission it could not observe contributes `UNKNOWN`. A run given
  no site skips every site-scoped permission the same way, so bare `cairn auth check` exits 1
  even when every credential is set. The run exits on the precedence fold of those rows, so it
  can exit 0, 1, 2, or 3.

## Usage errors

A usage error exits 3 with byte-empty stdout; its message goes to stderr, so stdout carries
payloads alone. `--json` beats `--quiet`, so empty stdout under `--json` means the invocation was
wrong, never that the site is healthy. `--color` takes `auto`, `always`, or `never`; `--theme`
takes `dark` or `light`; `--width` takes a whole number from 20 to 1000. Any other value is a
usage error and exits 3.

`cairn health <site>` takes the site as a positional operand. A site id the registry does not
hold is a usage error: exit 3, byte-empty stdout.

## `--help` and `--version`

`--help` and `--version` exit 0.

## Timeout bounds

Three nested bounds govern how long a run can take:

- Every provider request is capped at 15 seconds.
- Each check makes at most a fixed number of requests, published in the table below.
- `--timeout` (`-t`) bounds the whole command, default 480 seconds.

The timeout is a ceiling.

## Requests per check

| Check | Requests |
| --- | --- |
| `creds` | 2 |
| `serving` | 6 |
| `delegation` | 2 |
| `https-forced` | 1 |
| `email` | 9 |
| `deploy` | 4 |
| `publish-path` | 2 |
| `engine` | 4 |
| `errors` | 1 |

In the worst case every request runs serially and hits its 15-second cap: 31 requests at 15
seconds is 465 seconds. The 480-second default is that rounded up to the next whole minute.

## Sweeping multiple sites

```
whole-run budget = min(480 seconds x sites, 1920 seconds)
per-site budget  = min(480 seconds, remaining budget / sites still to run)
```

An explicit `--timeout` replaces the whole-run budget, and the division works the same inside it.
A site the budget never reaches counts `UNKNOWN` toward the run's exit code and is omitted from
the [`--json` stream](./cli-cairn-json-output.md) rather than emitted empty. A site cut short
partway through reports each unfinished check `unknown` with `reason.not-run`.

## `cairn doctor`

[`cairn doctor [<dir>]`](./cli-cairn-doctor.md) reads a directory rather than a registered site:
it needs no credential and no registry record, makes at most one network request, and has no row
in the requests-per-check table above. Its exit 3 covers a usage error, a run whose only
non-passing results are `UNCHECKED`, and a directory that is not a cairn site, so a caller tests
for a nonzero exit rather than switching on 3 alone.
