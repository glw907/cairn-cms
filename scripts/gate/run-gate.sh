#!/usr/bin/env bash
# The proving tools' one entry:
#   bash scripts/gate/run-gate.sh --smoke
#   bash scripts/gate/run-gate.sh sweep [--apply | --check-scopes] [--headed]
#   bash scripts/gate/run-gate.sh probe | scripted
#   bash scripts/gate/run-gate.sh naive
#   bash scripts/gate/run-gate.sh grade <run dir> [--end stall|budget [--reason "<text>"]]
#   bash scripts/gate/run-gate.sh shell <name> [cleanroom shell options]
#
# Sources the workstation's secrets (the pattern CLAUDE.md names for a script), and starts the
# gate's node scripts under an environment built from an allowlist rather than from this shell. It
# never echoes a value.
#
# One run at a time: fd 9 holds a flock on the state dir's `lock`, and every child is started with
# `9>&-` so the lock dies with this script and no orphaned child keeps it. flock(1) cannot name a
# holder, so a held run writes `<pid> <run dir>` to `lock.holder` and a refusal prints that line.
# `--smoke` and `sweep` print `run dir: <path>` first and write their final status to
# `<run dir>/exit` last. `probe`, `naive`, and `scripted` start a run in the clean room and return
# at once, printing the run id, the tmux session, and the run directory; the lock for the run's
# length is the live `cleanroom-*` tmux session, which the next start refuses on.
#
# Test hooks: CLEANROOM_ROOT (default /var/tmp/cleanroom) names the clean room's directory, and
# CLEANROOM_PROBE_COMMANDS the probe's command list.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$HOME/.local/secrets" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$HOME/.local/secrets"
  set +a
fi

umask 077
state="$HOME/.local/state/cairn-gate"
cleanroom_root="${CLEANROOM_ROOT:-/var/tmp/cleanroom}"

# The names the harness reads. Values are carried by name and never printed. GATE_SITE_NAME and
# GATE_OWNER_EMAIL, which the stand-in reads, are among the GATE_ names.
cairn_bin=""
allowed=()
while IFS= read -r name; do
  allowed+=("$name=${!name}")
done < <(compgen -e | grep -E '^(CF_WS_CAIRN_CLEANROOM_TOKEN|STALWART_PASSWORD_CAIRN_GATE|GITHUB_TEST_[A-Z_]+|GATE_[A-Z_]+)$' || true)

# The display and session-bus names the headed browser needs. Each is passed only
# when set, so a host without a display passes none.
session=()
for name in DISPLAY WAYLAND_DISPLAY XAUTHORITY XDG_RUNTIME_DIR DBUS_SESSION_BUS_ADDRESS; do
  if [ -n "${!name:-}" ]; then session+=("$name=${!name}"); fi
done

# A node script under the allowlisted environment, with the lock's fd closed.
run_node() {
  env -i \
    "${allowed[@]}" \
    "${session[@]}" \
    PATH="$PATH" \
    HOME="$HOME" \
    TERM="${TERM:-xterm-256color}" \
    LANG="${LANG:-C.UTF-8}" \
    ${run_dir:+GATE_RUN_DIR="$run_dir"} \
    node "$@" 9>&-
}

gate() {
  run_node "$here/gate.mjs" "$@"
}

# The clean room's tools run with a scrubbed environment too: they read their own credentials
# from the store, so none of this shell's names reach them.
scrubbed() {
  env -i PATH="$PATH" HOME="$HOME" TERM="${TERM:-xterm-256color}" LANG="${LANG:-C.UTF-8}" \
    ${XDG_RUNTIME_DIR:+XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR"} \
    CLEANROOM_ROOT="$cleanroom_root" "$@" 9>&-
}

case "${1:-}" in
  shell)
    shift
    exec env -i PATH="$PATH" HOME="$HOME" TERM="${TERM:-xterm-256color}" LANG="${LANG:-C.UTF-8}" \
      ${XDG_RUNTIME_DIR:+XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR"} cleanroom shell "$@"
    ;;
  grade)
    shift
    exec env -i \
      "${allowed[@]}" \
      "${session[@]}" \
      PATH="$PATH" \
      HOME="$HOME" \
      TERM="${TERM:-xterm-256color}" \
      LANG="${LANG:-C.UTF-8}" \
      node "$here/grade.mjs" "$@"
    ;;
esac

mkdir -p -m 0700 "$state"
exec 9>"$state/lock"
if ! flock -n 9; then
  holder="$(cat "$state/lock.holder" 2>/dev/null || true)"
  echo "Another gate run holds the lock: ${holder:-holder unknown}" >&2
  holder_pid="${holder%% *}"
  if [ -n "$holder_pid" ] && kill -0 "$holder_pid" 2>/dev/null; then
    echo "Its process $holder_pid is alive." >&2
  else
    echo "Its process ${holder_pid:-unknown} was not found by kill -0." >&2
  fi
  exit 1
fi

# What stands in the way of a start, from outside: a live clean-room session on either tmux socket,
# a ledger row that reads running, a run process, and, for `naive`, the loop's own limits. It prints
# `REFUSE <reason>` lines and exits 1, or prints `CAP <dollars>` for `naive` and exits 0.
read -r -d '' preflight <<'EOF' || true
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const [kind] = process.argv.slice(1);
const root = process.env.CLEANROOM_ROOT;
const home = process.env.HOME;
const refusals = [];
const run = (cmd, args) => {
  try {
    return { ok: true, out: execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) };
  } catch {
    return { ok: false, out: '' };
  }
};
const jsonl = (file) =>
  existsSync(file)
    ? readFileSync(file, 'utf8')
        .split('\n')
        .filter(Boolean)
        .flatMap((line) => {
          try {
            return [JSON.parse(line)];
          } catch {
            return [];
          }
        })
    : [];

for (const socket of [null, path.join(home, '.local', 'state', 'cleanroom', 'tmux-scripted.sock')]) {
  const listed = run('tmux', [...(socket ? ['-S', socket] : []), 'list-sessions', '-F', '#{session_name}']);
  for (const name of listed.out.split('\n')) if (name.startsWith('cleanroom-')) refusals.push(`the tmux session ${name} is live${socket ? ' on the scripted socket' : ''}`);
}
const latest = new Map();
for (const row of jsonl(path.join(root, 'ledger.jsonl'))) latest.set(String(row.name), row);
for (const row of latest.values()) if (row.state === 'running') refusals.push(`the ledger row ${row.name} reads running`);
if (run('id', ['-u', 'cleanroom']).ok) {
  const pids = run('pgrep', ['-u', 'cleanroom']).out.split('\n').filter(Boolean);
  if (pids.length > 0) refusals.push(`${pids.length} process(es) owned by cleanroom are alive (first pid ${pids[0]})`);
} else {
  let found = 0;
  for (const entry of existsSync('/proc') ? readdirSync('/proc') : []) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      if (readFileSync(`/proc/${entry}/environ`, 'latin1').includes(`HOME=${root}/`)) found++;
    } catch {
      /* not ours to read */
    }
  }
  if (found > 0) refusals.push(`${found} process(es) with a clean-room HOME are alive`);
}

let cap = null;
if (kind === 'naive') {
  const capOf = (row) => Number(row.cap_usd ?? row.capUsd ?? row.cap ?? 20);
  const legOf = (row) => {
    if (row.leg) return row.leg;
    try {
      return JSON.parse(readFileSync(path.join(root, String(row.name), 'run', 'harness.json'), 'utf8')).leg ?? 'naive';
    } catch {
      return 'naive';
    }
  };
  const naiveRows = [...latest.values()].filter((row) => /^\d{10}$/.test(String(row.name)) && legOf(row) !== 'scripted');
  // A running row whose session is gone is counted at its full cap, since its cost never settled.
  const costOf = (row) => (row.state === 'running' ? capOf(row) : Number(row.cost ?? 0));
  let spend = [...latest.values()].reduce((sum, row) => sum + costOf(row), 0);
  if (naiveRows.length >= 15) refusals.push(`the ledger holds ${naiveRows.length} naive runs; a sixteenth is refused`);
  cap = Math.min(20, 100 - spend);
  if (cap < 5) refusals.push(`the budget stop: $${spend.toFixed(2)} spent leaves $${(100 - spend).toFixed(2)} of $100, under the $5 floor`);
  const template = path.join(home, '.local', 'share', 'cleanroom', 'settings.json');
  const passing = jsonl(path.join(root, 'probes.jsonl')).filter((row) => row.verdict === 'pass').at(-1);
  const sha = existsSync(template) ? createHash('sha256').update(readFileSync(template)).digest('hex') : null;
  if (!passing) refusals.push('probes.jsonl holds no passing probe row');
  else if (sha !== passing.sha256) refusals.push(`the stowed template's sha256 ${sha} differs from the last passing probe's ${passing.sha256}`);
}
for (const reason of refusals) console.log(`REFUSE ${reason}`);
if (refusals.length === 0 && cap !== null) console.log(`CAP ${cap.toFixed(2)}`);
process.exit(refusals.length === 0 ? 0 : 1);
EOF

# Run the preflight for a start; on a refusal, print what it found and exit 1. `CAP` lands in
# `$preflight_cap`.
preflight_cap=""
refuse_unless_clear() {
  local out
  if ! out="$(scrubbed node --input-type=module -e "$preflight" -- "$@")"; then
    echo "Refused: $1 will not start." >&2
    echo "$out" | sed -n 's/^REFUSE /  /p' >&2
    if echo "$out" | grep -Eq '^REFUSE (the tmux session |[0-9]+ process\(es\))'; then
      echo "A live clean-room session or process: \`cleanroom stop geoff\` ends the session and its leftover daemons." >&2
    fi
    exit 1
  fi
  preflight_cap="$(echo "$out" | sed -n 's/^CAP //p')"
}

# The sweep's dry run, which `naive` never lets list a target: it deletes nothing, and a start
# over leftovers would mix two runs.
refuse_unless_swept() {
  local out rc=0
  out="$(gate sweep 2>&1)" || rc=$?
  local summary
  summary="$(echo "$out" | sed -n 's/^sweep: \([0-9]*\) target(s) to delete, \([0-9]*\) old gate name(s), \([0-9]*\) record(s).*/\1 \2 \3/p' | tail -n 1)"
  if [ "$rc" -ne 0 ] || [ -z "$summary" ] || [ "$summary" != "0 0 0" ]; then
    echo "Refused: the sweep's dry run lists leftovers or failed (exit $rc, counts: ${summary:-none}). Nothing is deleted here." >&2
    echo "$out" | grep -E '^(delete |old gate |RECORD )' >&2 || true
    exit 1
  fi
}

# The run's own tmux sessions start under a clean environment, so the tmux server holds none of
# this shell's secrets.
tmx() {
  env -i PATH="$PATH" HOME="$HOME" TERM="${TERM:-xterm-256color}" tmux "$@" 9>&-
}

# Start `<command>` as tmux session `$2` with the harness's names in a 0600 hand-off file the
# command sources and unlinks, so no value sits in argv.
start_session() {
  local session_name="$1" envfile="$2"
  shift 2
  {
    for pair in "${allowed[@]}" "${session[@]}"; do
      case "${pair%%=*}" in
        CF_WS_CAIRN_CLEANROOM_TOKEN) continue ;;
        # Only `--cairn-bin` hands the driver a binary, so a caller's variable never runs unrecorded.
        GATE_CAIRN_BIN) continue ;;
      esac
      printf 'export %s=%q\n' "${pair%%=*}" "${pair#*=}"
    done
    printf 'export CLEANROOM_ROOT=%q\n' "$cleanroom_root"
    printf 'export GATE_SITE_NAME=%q\n' "$site_name"
    printf 'export GATE_OWNER_EMAIL=%q\n' "${GATE_OWNER_EMAIL:-cairn-gate@probe.907.life}"
    if [ -n "$cairn_bin" ]; then printf 'export GATE_CAIRN_BIN=%q\n' "$cairn_bin"; fi
  } >"$envfile"
  tmx new-session -d -s "$session_name" \
    "exec env -i PATH=$PATH HOME=$HOME TERM=xterm-256color bash -c '. $envfile; rm -f $envfile; exec \"\$@\"' bash $*"
}

handoff_dir="${XDG_RUNTIME_DIR:-$state}/cairn-gate"

# The id, the harness file, and the clean room's directory for a naive or scripted run.
start_run() {
  local leg="$1"
  run_id="$(date -u +%y%m%d%H%M)"
  run_path="$cleanroom_root/$run_id/run"
  if [ -e "$cleanroom_root/$run_id" ]; then
    echo "Refused: the run id $run_id already has a directory. Wait a minute and retry." >&2
    exit 1
  fi
  site_name="Cairn gate $run_id"
  local engine tool commit
  if ! engine="$(npm view @glw907/cairn-cms@gate version 2>/dev/null)" || ! tool="$(npm view create-cairn-site@gate version 2>/dev/null)"; then
    echo "Refused: the gate dist-tag does not resolve for the engine and the launcher, so there is no candidate." >&2
    exit 1
  fi
  commit="$(git -C "$here" rev-parse HEAD 2>/dev/null || echo unknown)"
  # A local build never stands for the published candidate: its row names the commit it was built at.
  if [ -n "$cairn_bin" ]; then tool="local build at $commit"; fi
  scrubbed cleanroom init "$run_id" >&2
  mkdir -p -m 0700 "$handoff_dir"
  # The run keeps its own copy, so a rebuild mid-run changes nothing it ran. It is copied before the
  # harness file is written, so a failed copy leaves no record of a run that never started.
  if [ -n "$cairn_bin" ]; then
    install -m 0755 "$cairn_bin" "$cleanroom_root/$run_id/cairn"
    cairn_bin="$cleanroom_root/$run_id/cairn"
  fi
  node -e 'const [leg, id, siteName, commit, engine, tool, local] = process.argv.slice(1); process.stdout.write(JSON.stringify({ leg, id, siteName, begin: process.env.GATE_BEGIN, commit, candidate: { engine, tool }, local: local === "1" }, null, 2) + "\n");' \
    "$leg" "$run_id" "$site_name" "$commit" "$engine" "$tool" "${cairn_bin:+1}" >"$run_path/harness.json"
  # The scripted driver starts its own stand-in, so only a naive run gets one here.
  if [ "$leg" = naive ]; then
    start_session "cleanroom-$run_id-stand-in" "$handoff_dir/$run_id-stand-in.env" node "$here/stand-in.mjs" "$run_path"
  fi
}

report() {
  echo "run id: $run_id"
  echo "session: cleanroom-$run_id"
  echo "run dir: $run_path"
}

new_run_dir() {
  run_dir="$state/runs/$(date +%Y%m%dT%H%M%S)-$1"
  mkdir -p -m 0700 "$run_dir"
  echo "$$ $run_dir" >"$state/lock.holder"
}

GATE_BEGIN="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
export GATE_BEGIN

case "${1:-}" in
  naive)
    shift
    transcript=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --conductor-transcript) transcript="${2:-}"; shift 2 ;;
        *) echo "Usage: run-gate.sh naive [--conductor-transcript <path>]" >&2; exit 2 ;;
      esac
    done
    refuse_unless_clear naive "$transcript"
    new_run_dir naive
    refuse_unless_swept
    start_run naive
    goal='Set up a new cairn site and sign in as owner. cairn is at https://github.com/glw907/cairn-cms.'
    if ! scrubbed cleanroom run "$run_id" --goal "$goal" \
      --secret CF_WS_CAIRN_CLEANROOM_TOKEN:CAIRN_CF_SETUP_TOKEN \
      --secret CLAUDE_CLEANROOM_OAUTH_TOKEN:CLAUDE_CODE_OAUTH_TOKEN \
      --env npm_config_tag=gate \
      --cap-usd "$preflight_cap" --cap-min 60 >&2; then
      tmx kill-session -t "cleanroom-$run_id-stand-in" 2>/dev/null || true
      echo "cleanroom run failed; the stand-in is stopped." >&2
      exit 1
    fi
    report
    exit 0
    ;;
  scripted)
    shift
    while [ $# -gt 0 ]; do
      case "$1" in
        --cairn-bin)
          if [ -z "${2:-}" ]; then echo "Usage: run-gate.sh scripted [--cairn-bin <path>]" >&2; exit 2; fi
          cairn_bin="$2"; shift 2 ;;
        *) echo "Usage: run-gate.sh scripted [--cairn-bin <path>]" >&2; exit 2 ;;
      esac
    done
    if [ -n "$cairn_bin" ] && ! [ -f "$cairn_bin" -a -x "$cairn_bin" ]; then
      echo "Refused: --cairn-bin $cairn_bin is not an executable file." >&2
      exit 2
    fi
    refuse_unless_clear scripted
    new_run_dir scripted
    start_run scripted
    mkdir -p -m 0700 "$run_dir/shots"
    start_session "cleanroom-$run_id" "$handoff_dir/$run_id-scripted.env" node "$here/scripted.mjs" "$run_path" --shots "$run_dir/shots"
    report
    echo "shots: $run_dir/shots"
    exit 0
    ;;
  probe)
    refuse_unless_clear probe
    scrubbed cleanroom init probe --fresh --discard >&2
    run_id=probe
    run_path="$cleanroom_root/probe/run"
    scrubbed cleanroom probe probe \
      --commands "${CLEANROOM_PROBE_COMMANDS:-$HOME/.local/share/cleanroom/probe-commands.md}" \
      --secret CLAUDE_CLEANROOM_OAUTH_TOKEN:CLAUDE_CODE_OAUTH_TOKEN \
      --secret CF_WS_CAIRN_CLEANROOM_TOKEN:CAIRN_CF_SETUP_TOKEN \
      --secret GITHUB_TEST_TOKEN:GH_TOKEN \
      --env npm_config_tag=gate >&2
    report
    exit 0
    ;;
  sweep)
    case " $* " in
      *" --apply "*) refuse_unless_clear apply ;;
    esac
    ;;
esac

run_dir="$state/runs/$(date +%Y%m%dT%H%M%S)"
mkdir -p -m 0700 "$run_dir"
echo "$$ $run_dir" >"$state/lock.holder"
echo "run dir: $run_dir"

# Not `exec`: the exit status lands in the run directory however the run ends, so a backgrounded
# run can be read afterwards.
cleanup() {
  local status=$?
  trap - EXIT
  echo "$status" >"$run_dir/exit"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

gate "$@"
