# Running the tripwire on a schedule

`cairn` adds no `tripwire` subcommand. The tripwire is `cairn health` itself, run on a schedule
and wired to page someone on a non-zero exit. This page has a working example for each of three
schedulers: `systemd`, `launchd`, and Windows Task Scheduler. Pick the one that matches your
platform, copy it, and change the paths and the account name.

Every example runs bare `cairn health --quiet`, one command that sweeps the whole registry. This
page also shows the alternative, a per-site loop, and says when to reach for it instead.
[`docs/reference/exit-codes.md`](reference/exit-codes.md) is the full contract behind the four
codes and the `--timeout` arithmetic these examples size against; this page assumes you have read
it.

## Credentials: a scheduler starts with no shell profile

`systemd`, `launchd`, and Task Scheduler all launch a job directly, never through a login or an
interactive shell, so none of them sources `~/.bashrc`, `~/.zshrc`, or a PowerShell profile. A
variable you only export from a shell profile is invisible to a scheduled run even though it
works every time you type `cairn` yourself. Each example below gives the run its own credentials,
by one of two routes: an environment file the scheduler reads directly, or the OS keyring
`cairn auth set` writes to (`cairn` resolves the environment first, then the keyring, the same
order documented in [`docs/credentials.md`](credentials.md)).

## systemd (Linux)

A user service plus a user timer. Nothing here needs root.

`~/.config/cairn/tripwire.env` holds the three credentials, and its permissions matter: a file a
service reads into its own environment is as sensitive as the credentials in it, so it is mode
`0600`, readable by you alone.

```sh
mkdir -p ~/.config/cairn
cat > ~/.config/cairn/tripwire.env <<'EOF'
CAIRN_CF_ACCOUNT_ID=...
CAIRN_CF_READ_TOKEN=...
CAIRN_GH_READ_TOKEN=...
EOF
chmod 600 ~/.config/cairn/tripwire.env
```

`~/.config/systemd/user/cairn-health.service`:

```ini
[Unit]
Description=cairn health sweep
# A non-zero exit marks this unit failed, which is what fires the alert template below.
OnFailure=cairn-health-alert@%n.service

[Service]
Type=oneshot
EnvironmentFile=%h/.config/cairn/tripwire.env
ExecStart=%h/.local/bin/cairn health --quiet
# 2400s sits above the default sweep's own 1920s cap (exit-codes.md, "Timeouts, and sizing a
# scheduler's cap"), with headroom. TimeoutStartSec, not RuntimeMaxSec, is the cap that actually
# applies to a Type=oneshot service (systemd.service(5): RuntimeMaxSec has no effect on oneshot
# units). A run systemd kills at TimeoutStartSec exits however SIGKILL leaves it, never one of
# cairn's own four codes, so the cap has to sit above --timeout: a routine that reads an
# uninterpretable kill instead of cairn's own UNKNOWN is worse than the slow run it was meant to
# catch.
TimeoutStartSec=2400
```

`~/.config/systemd/user/cairn-health.timer`:

```ini
[Unit]
Description=Run the cairn health sweep daily

[Timer]
OnCalendar=daily
# A run missed while the machine was suspended fires once on resume, instead of silently
# skipping a day.
Persistent=true

[Install]
WantedBy=timers.target
```

`OnFailure` needs a unit to hand off to. `~/.config/systemd/user/cairn-health-alert@.service` is
a small template that reads the failed run's exit code and routes it; wire `notify-operator` into
your own paging or mail tool.

```ini
[Unit]
Description=Alert on a failed cairn health sweep (%i)

[Service]
Type=oneshot
# ExecMainStatus is the failed unit's own exit code: 1 WARNING, 2 CRITICAL, 3 UNKNOWN, or a
# scheduler-level failure (a kill past TimeoutStartSec) that is none of the three. journalctl -u
# %i carries the quiet body itself: the verdict word, each failing check id, and its fix, with
# no credential in it (cairn health --quiet never prints one).
ExecStart=/bin/sh -c 'notify-operator "$(systemctl --user show %i -p ExecMainStatus --value)" "$(journalctl --user -u %i -n 50 --no-pager)"'
```

Enable and start the timer, not the service; the service runs only when the timer or `OnFailure`
fires it.

```sh
systemctl --user daemon-reload
systemctl --user enable --now cairn-health.timer
```

## launchd (macOS)

A `LaunchAgent` plist plus a small wrapper script. launchd has no `OnFailure` hook of its own, so
the wrapper is what gives a failed run somewhere to go; `cairn health --quiet` is still the one
command the wrapper runs.

`~/.local/bin/cairn-health-run`:

```sh
#!/bin/sh
# launchd runs one program per job with no exit-code routing of its own, so this wrapper reads
# the exit code cairn health leaves and routes it. Wire notify-operator into your own paging or
# mail tool; the case arms are the run's own vocabulary, not this script's. Capturing the output
# and printing it back keeps StandardOutPath's trace intact while also handing the alert
# something to page with: the failing site, each failing check's id, and its fix. The capture
# folds stderr in, so the whole trace lands in StandardOutPath and StandardErrorPath stays empty;
# split the capture if you would rather read the two streams apart.
out=$(cairn health --quiet 2>&1)
code=$?
# An OK run captures nothing, and the guard keeps it that way: an unconditional printf would
# write one newline per green run and StandardOutPath would never be empty again.
[ -n "$out" ] && printf '%s\n' "$out"
case "$code" in
  0) ;;                                        # OK, nothing to report
  1) notify-operator warning "$out" ;;
  2) notify-operator critical "$out" ;;
  3) notify-operator unknown "$out" ;;
  *) notify-operator unknown "$out" ;;          # the process itself was killed or crashed
esac
exit "$code"
```

```sh
chmod +x ~/.local/bin/cairn-health-run
```

`~/Library/LaunchAgents/pub.cairn.health.plist`. Credentials come from the keyring
(`cairn auth set`, resolved by `cairn` itself, the same as an interactive run), never from this
file; putting them in `EnvironmentVariables` instead would leave them sitting in a plist most
tooling treats as ordinary, world-readable configuration, which the keyring does not.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>pub.cairn.health</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/operator/.local/bin/cairn-health-run</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/Users/operator/.local/bin</string>
    </dict>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>8</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/Users/operator/Library/Logs/cairn-health.out.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/operator/Library/Logs/cairn-health.err.log</string>
</dict>
</plist>
```

launchd has no execution cap of its own comparable to systemd's `TimeoutStartSec`, so a run that
hangs past `--timeout` is the only cap in force; the wrapper never adds a second one. Pass
`--timeout` explicitly here only to replace the default whole-run budget described below.

```sh
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/pub.cairn.health.plist
```

## Windows Task Scheduler

Set the credentials first, with `cairn auth set`, which prompts for each value with echo off and
writes it to Credential Manager. This is the form this example uses, because Credential Manager
never puts the value in `HKCU\Environment` at all.

```powershell
cairn auth set CAIRN_CF_ACCOUNT_ID
cairn auth set CAIRN_CF_READ_TOKEN
cairn auth set CAIRN_GH_READ_TOKEN
```

`setx` is the fallback, only when Credential Manager is not available to the account the task
runs under. It carries two caveats a scheduled credential cannot afford: it writes the value as
plaintext into `HKCU\Environment`, readable by anything that can read the registry key, and it
truncates a value at 1024 characters, which silently corrupts a longer token with no error at set
time or at read time.

```powershell
setx CAIRN_GH_READ_TOKEN "..."
```

A Credential Manager entry is per-user, which is why the task has to run as the operator's own
account (`/RU`), not as `SYSTEM` or a service account that cannot reach it.

`~/bin/cairn-health-run.ps1`, the wrapper Task Scheduler runs. Task Scheduler routes a task's
result through its own History pane, but not by cairn's own exit code, so this wrapper reads
`$LASTEXITCODE` and routes it; wire `Send-Alert` into your own paging or mail tool.

```powershell
$out = & cairn.exe health --quiet 2>&1 | Out-String
$code = $LASTEXITCODE
# An OK run captures nothing, and the guard keeps the task's own log empty until something is
# wrong; $code is read before anything else can overwrite $LASTEXITCODE.
if ($out.Trim()) { Write-Output $out.TrimEnd() }
switch ($code) {
    0 { }                                    # OK, nothing to report
    1 { Send-Alert -Level Warning -Body $out }
    2 { Send-Alert -Level Critical -Body $out }
    3 { Send-Alert -Level Unknown -Body $out }
    default { Send-Alert -Level Unknown -Body $out }    # the process itself was killed or crashed
}
exit $code
```

A stock Windows client ships PowerShell's execution policy at `Restricted`, which refuses to run
a `.ps1` at all (`-File` errors with "running scripts is disabled on this system"). Bypass the
policy for this one invocation, scoped to the process `schtasks` launches, not a system-wide
policy change:

```powershell
schtasks /create /tn "cairn health" /tr "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File C:\Users\operator\bin\cairn-health-run.ps1" /sc daily /st 08:00 /ru "$env:USERNAME"
```

`schtasks /create` has no flag that caps a single run's execution time; its own `/et` sets the
end time of a *repeating* schedule window (used with `/ri`), not a per-run cap. The mechanism
that actually caps one run is the task definition's `ExecutionTimeLimit` setting, reachable from
PowerShell's `ScheduledTasks` module without hand-authoring a full task-definition XML. Run this
against the task the `schtasks` call above just created; it replaces that task's settings with
the same trigger and action plus the 40-minute cap, matching the systemd example's 2400s
`TimeoutStartSec`:

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File C:\Users\operator\bin\cairn-health-run.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At "08:00"
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 40)
Set-ScheduledTask -TaskName "cairn health" -Action $action -Trigger $trigger -Settings $settings
```

## Prefer the bare sweep; the per-site loop is for a per-site exit code

Every example above runs `cairn health --quiet` bare, sweeping every site the registry holds in
one command and one exit code. This is what an operator wants from a scheduled routine: one page,
and one place to look.

The alternative is a per-site loop, useful only when you want a distinct exit code per site
rather than the sweep's single worst-of-all verdict, for example routing one site's alert to a
different channel than another's:

```sh
sites=$(cairn sites list --json --expect-sites 4 | jq -r '.sites[].id')
for id in $sites; do
  cairn health "$id" --quiet
done
```

`--expect-sites` here is doing real work: a registry that grew or shrank since you wrote this
script exits `UNKNOWN` rather than silently sweeping the wrong count. Prefer the bare sweep; reach
for the loop only when a single combined verdict genuinely will not do, since it is one command
and one exit code per site to route instead of one.

The concurrent form of the sweep, where every site's checks run at once instead of one after
another, is 2.0 work; 1.0's bare sweep runs each site in turn.

## `--quiet`: silent on green, always loud on anything else

All three examples above pass `--quiet`. On an `OK` run it writes nothing to either stream, which
is what makes a green morning silent: cron sends no mail, and `StandardOutPath` and
`StandardErrorPath` stay empty until something is actually wrong. A routine that prints on every
green run trains you to stop reading it.

`--quiet` suppresses only the `OK` case. Every `WARNING`, `CRITICAL`, or `UNKNOWN` run still
writes its verdict and its failing checks, `--quiet` or not. `--json` beats `--quiet` outright: a
`--json` invocation always prints its payload, because an empty stdout under `--json` means the
invocation itself was wrong, not that the site is healthy. A routine that logs JSON should pass
`--json` and drop `--quiet` (the flag still parses, it simply never has anything left to
suppress).

Proved against the release-candidate binary, an adopted site with no real Cloudflare or GitHub
credentials configured (every credentialed check reports `skip`, and the plain `email` check runs
for real over the network):

```
$ cairn health ecxc-ski-a1b2c3 --quiet
verdict: CRITICAL - ecxc.ski, 1 failing, 7 could not run, 1 passing
checked: 2026-09-21 10:51-08:00, in 1.7s

email: fail - no DKIM record found for the sending subdomain
fix: Publish a DKIM TXT record for the sending subdomain's provider.
fix actor: operator (changes the live site)

verdict: CRITICAL - ecxc.ski, 1 failing, 7 could not run, 1 passing
exit: 2
```

The complementary `OK` path, byte-empty stdout and stderr on a fully green run, needs real
Cloudflare and GitHub credentials against a live site to prove directly; `TestQuietWritesNothingOnAnOKRun`
in `cmd/cairn/health_test.go` proves the same rule with a synthetic passing report, and running
this exact invocation against your own adopted sites once, before you trust the scheduled job, is
worth doing before you rely on the silence.

## `--timeout`: most operators pass none

`--timeout` bounds the whole run's wall clock, and its default already scales with your registry
up to a cap, so most scheduled routines pass no `--timeout` at all: `min(480s x sites, 1920s)`.
Up to four sites each get the full 480 seconds; a larger registry shares the 1920-second cap,
divided among the sites still to run and recomputed after each one settles, so a single slow site
cannot eat the rest.

An operator who passes `--timeout` explicitly replaces the whole-run budget with that value, and
the same division applies inside it. Size it by the same arithmetic
[`docs/reference/exit-codes.md`](reference/exit-codes.md) states for your own registry's size, not
by guessing; a value sized for four sites left running against forty will starve most of them.

## Alerting: choose the threshold, alert once, never a credential

Where the alert threshold sits is the operator's choice, and there are two settings worth making:
**exit 2 and above pages someone**, and **any non-zero exit notifies**. Start with the first. A
held failing check exits 1 by design, so a routine that pages on any non-zero wakes someone every
day for a check you already acknowledged, which makes the acknowledgement worth nothing. The
notify tier is where exit 1 belongs: visible in a mailbox or a channel, waking nobody.

The choice is the same under all three schedulers above. Each one hands cairn's own exit code to
the alert tool rather than firing one undifferentiated alert, so the threshold is a line in
`notify-operator` or `Send-Alert`, not a change to the unit, the plist, or the task.

`cairn`'s four codes exist to make that routing possible:

| Code | Word | Route it as |
| --- | --- | --- |
| 0 | `OK` | Nothing. `--quiet` already suppressed it. |
| 1 | `WARNING` | Notified, nobody paged. A held check and a drifting engine version both land here. |
| 2 | `CRITICAL` | Paged. |
| 3 | `UNKNOWN` | Paged; the run could not observe the site at all. |

Act on the first run that crosses your threshold, not after two consecutive ones. A debounced
routine trades a day's delay on a real failure for one fewer false alarm, and the delay costs
more.

An alert body is exactly what the quiet output above already is: the failing site, each failing
check's id, and its fix, nothing else. `cairn health --quiet` never prints a credential or a
verbose field in any of its three output forms (the plain body, `--json`, or the progress lines
`--verbose` writes to stderr), so piping the command's own output straight into a mail or a page
is already safe.

## Keeping the first run green: acknowledge, don't silence

A fresh registry's first scheduled run is not always green, and turning a noisy check off
entirely is the wrong fix: it silences the check for every future run, not just the one you
already know about.

`--ack <check-id>=<YYYY-MM-DD>` acknowledges one check until the date you name. An acknowledged
failing check contributes `WARNING` instead of `CRITICAL`, reported but not paged, and the date is
required: an acknowledgement with no expiry would outlive the operator who granted it. It applies
per check id across every site in a sweep, so acknowledging `engine` once covers every site
lagging a release, not just one.

```sh
cairn health --quiet --ack engine=2026-10-15
```

For repeat use, `--ack-file` (default `acknowledgements.json` in the registry directory) holds
the same entries as a small file instead of a flag on every invocation.

Proved against the release-candidate binary, the same site as above with its one failing check
acknowledged, `CRITICAL` becomes `WARNING` and the exit code drops from 2 to 1:

```
$ cairn health ecxc-ski-a1b2c3 --quiet --ack email=2099-01-01
verdict: WARNING - ecxc.ski, 7 could not run, 1 held, 1 passing
checked: 2026-09-21 10:52-08:00, in 980ms

verdict: WARNING - ecxc.ski, 7 could not run, 1 held, 1 passing
exit: 1
```

`--error-threshold` is the same idea for a noisy site's error-rate check: it raises the count of
matching log events the `errors` check tolerates before it fails, instead of you acknowledging the
same check every morning. It defaults to 5 over the run's `--since` window (24 hours, by default).

## Why this page, and not a ROADMAP line or a cloud agent

A scheduled unit like the ones above is the machine-detectable form of this watch: the timer
fires whether or not anyone remembers it exists, which is the whole point of a tripwire. No
`ROADMAP.md` line should duplicate it as a someday item; the mechanism above is the thing itself,
not a plan to build it.

A cloud routine through the workstation's `schedule` skill is not the answer either. That skill
pings a cloud agent on a schedule, and a cloud agent reaches none of what this page's examples
reach: no operator's own environment variables, no OS keyring, no local site registry, and no
installed `cairn` binary. It becomes a correct answer only once a hosted spine exists that a cloud
routine could call instead of a local binary, which is 2.0 work, not 1.0's.
