# Exit codes and the run contract

`cairn` is a monitoring plugin. Every command ends in one of four exit codes, and a scheduled
routine reads that code alone. This page is the contract behind it: the codes, the precedence
rule, what changes a code, what never does, and the timeout arithmetic you size a scheduler's own
cap against.

The convention is the Monitoring Plugins one, the Nagios lineage that Icinga, Sensu, `systemd`
unit handlers, and most alerting tools already read. Nothing here is cairn-specific, so an
operator's existing routine needs no per-tool table to interpret a run.

## The four codes

| Code | Word | Meaning |
| --- | --- | --- |
| 0 | `OK` | Every check passed. |
| 1 | `WARNING` | A fault worth reporting that nobody is woken for. |
| 2 | `CRITICAL` | A fault the operator is paged for. |
| 3 | `UNKNOWN` | The run could not observe the site. |

## Precedence

Combining many checks, or many sites, takes the worst by this order:

```
CRITICAL  >  UNKNOWN  >  WARNING  >  OK
```

That is deliberately not numeric order. **3 does not beat 2.** A failing check is a known fault
and must never be masked by an unrelated check that could not run. An unknown outranks a warning
because an unknown hides a possible fault, while a warning is a disclosed and accepted one.

The same order applies inside one site and across a sweep of many, so one site's failure is never
masked by another site's unknown.

## What changes a check's contribution

A passing check contributes `OK`.

A failing check contributes `CRITICAL`, unless its own severity ranks it `WARNING`. The `engine`
check is the only one that does: a site a release or two behind still serves every page it served
yesterday, so version drift is work to schedule rather than a fault to be woken for. A failing
`creds` check stays `CRITICAL` even when the only fault is a token nearing its expiry, because the
window to fix it closes on its own and every run after it observes nothing at all.

An acknowledged failing check contributes `WARNING`. An acknowledgement silences notification,
never status, so a held failure is never reported `OK`. An acknowledgement whose expiry has passed
holds nothing, and the failure returns to `CRITICAL`.

A check that could not run contributes `UNKNOWN`, with one exclusion: a check skipped because its
credential is missing contributes `WARNING`. The operator disclosed that gap by not configuring
the credential, and paging them for it every morning is what makes a routine ignorable. Every
other unknown, a rate-limited run included, stays `UNKNOWN`, because the run did not observe the
site and cannot say the site is merely imperfect.

An acknowledgement never softens an unknown. An acknowledgement is an operator saying they know
something is broken and accept it, which they cannot say about a check that never ran.

A site with no checks at all is `UNKNOWN`, never `OK`. Folding an empty check list to `OK` prints
a false green for a site nothing was measured against.

Acknowledgements come from `--ack <check-id>=<YYYY-MM-DD>`, repeatable, and from the
acknowledgement file. `--ack-file` names that file; without it, cairn reads
`acknowledgements.json` in the registry directory, and its absence is not an error.

## The two ways a code is decided

There are exactly two, and they cannot collide.

1. **A run that produced reports** is folded by the precedence rule above. Its inputs are the
   per-site check verdicts, any error reading the registry, and the expected site count from
   `--expect-sites`.
2. **Everything that produced no report** is a typed error the program's entry point maps: a
   cancelled run, a usage error, `cairn auth probe`'s own measured verdict, and a tool fault.

None of the second group's cases can be expressed in the first group's inputs, which is why the
two can never disagree about one run.

## Usage errors

**A usage error exits 3 with byte-empty stdout.** An unknown flag, a missing required argument, a
malformed flag value, and an unknown subcommand all exit 3. An alerting routine already reads 3 as
"the check could not run", which is exactly what a usage error means; teaching it `sysexits.h`'s
64 alongside would be a second table for one case.

`--json` is a script's discriminator. A usage error emits no JSON at all, so **empty stdout means
the invocation was wrong, not that the site is healthy.** This is exactly why `--json` beats
`--quiet` rather than the two combining into a silent success: under `--json` the payload always
prints, and `--quiet` suppresses only a plain-text `OK` body.

Usage text and help printed because of an error go to stderr. stdout carries payloads alone.

**`--help` and `--version` exit 0.** This is a deliberate deviation from the monitoring
guidelines, which would have both exit 3. A person running `cairn --help` should not see a
failure, and no scheduled routine invokes either.

## Positional arguments

`cairn health <site>` takes its site as an operand, not as a flag. The monitoring guidelines
prefer flags for every input. POSIX, clig.dev, `gh`, and `kubectl` all accept a primary operand,
and an operator's muscle memory is the stronger signal here.

## Timeouts, and sizing a scheduler's cap

Three bounds nest.

- **Each HTTP request and DNS lookup is bounded at 15 seconds.** Nothing a check does can exceed
  it.
- **Each check makes at most a fixed number of requests**, published below.
- **`--timeout` bounds the whole command.** Its default is 480 seconds.

### Requests per check

| Check | Maximum requests | What they are |
| --- | --- | --- |
| `creds` | 2 | Verify the Cloudflare token, read the GitHub token's expiry. |
| `serving` | 6 | Two fetches over HTTPS, two over HTTP, then a nameserver lookup and one bounded authoritative sweep. |
| `delegation` | 2 | The domain's nameservers, and the Cloudflare zone. |
| `https-forced` | 1 | The zone's settings. |
| `email` | 9 | DMARC, SPF, six DKIM selectors, and the zone's email sending subdomains. |
| `deploy` | 4 | List Workers, the build connection, the last build, and the repository head. |
| `publish-path` | 2 | The repository's branches, and the last bot commit. |
| `engine` | 4 | The site's `package.json`, two npm queries, and the engine changelog. |
| `errors` | 1 | One observability query. |

Thirty-one requests at 15 seconds each is 465 seconds, the worst case where every request runs to
its own timeout. The 480-second default is that number rounded up. **The default was 120 seconds
until this arithmetic was written down**, which is a budget one site could not finish inside, so a
pathological run reported `UNKNOWN` rather than the fault it was measuring. A timeout is a ceiling
and not a wait: a healthy site still answers in a few seconds.

### A sweep over many sites

Bare `cairn health` sweeps every site the registry holds.

```
whole-run budget = min(480 seconds x sites, 1920 seconds)
per-site budget  = min(480 seconds, remaining budget / sites still to run)
```

The cap is four times the single-site budget, so a registry of up to four sites never reaches it
and every site in it gets the full 480 seconds. A registry of one site gets 480 seconds. A
registry of four gets 1920 seconds by the formula, which is the cap exactly. A registry of twelve
gets 1920 seconds too, and each site gets 160 of them.

Sites run one after another, and the per-site budget is recomputed after each one settles, so a
slow site spends its own share and never the share of a site behind it, and a fast sweep hands its
slack to the sites still to come. An explicit `--timeout` replaces the whole-run budget with the
value you name; the division works the same way inside it.

A site the budget never reaches is counted `UNKNOWN` toward the run's exit code. Under `--json`
it is omitted from the stream rather than emitted as an empty report.

A site the budget cuts short partway reports each of its unfinished checks `Unknown` with reason
`reason.not-run`, and that site's own verdict is `UNKNOWN`; the run's own exit code is 3. The
remedy is an explicit `--timeout` raising the whole-run budget, or fewer sites in the run: past
four sites the per-site share divides, so a twelve-site registry gives each site 160 seconds
rather than the full 480.

### The scheduler's own cap

Set a scheduler's cap **above** `--timeout`, with headroom. A scheduler that kills the process
first produces no exit code at all, so the routine reads a failure it cannot classify instead of
the `UNKNOWN` cairn would have reported. For the default sweep, 1920 seconds of budget wants a
scheduler cap of 2400 or more.

## Credentials under a scheduler

A scheduled run starts with no shell profile, so nothing in `~/.bashrc` or `~/.zshrc` reaches it.
The three variables cairn reads are `CAIRN_CF_ACCOUNT_ID`, `CAIRN_CF_READ_TOKEN`, and
`CAIRN_GH_READ_TOKEN`. Store them in the OS keyring with `cairn auth set <name>`, or set them in
the scheduler's own environment. The per-platform worked examples, a systemd unit and timer, a
launchd plist, and a Windows scheduled task, live beside this page in `tripwire.md`.
