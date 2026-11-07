#!/usr/bin/env bash
# The release gate's one entry: bash scripts/gate/run-gate.sh --smoke
#
# Sources the workstation's secrets (the pattern CLAUDE.md names for a script), makes this run's
# directory outside the worktree with mode 0700, and starts gate.mjs under an environment built
# from an allowlist rather than from this shell. It never echoes a value.
#
# One run at a time: fd 9 holds a flock on the state dir's `lock`, and every child is started with
# `9>&-` so the lock dies with this script and no orphaned child keeps it. flock(1) cannot name a
# holder, so a held run writes `<pid> <run dir>` to `lock.holder` and a refusal prints that line.
# The run prints `run dir: <path>` first and writes its final status to `<run dir>/exit` last.
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
run_dir="$state/runs/$(date +%Y%m%dT%H%M%S)"
mkdir -p -m 0700 "$run_dir"
echo "$$ $run_dir" >"$state/lock.holder"
echo "run dir: $run_dir"

# The names the harness reads. Values are carried by name and never printed.
allowed=()
while IFS= read -r name; do
  allowed+=("$name=${!name}")
done < <(compgen -e | grep -E '^(CF_WS_CAIRN_GATE_TOKEN|CF_CI_CAIRN_BUILD_TOKEN|STALWART_PASSWORD_CAIRN_GATE|GITHUB_TEST_[A-Z_]+|GATE_[A-Z_]+)$' || true)

# The display and session-bus names the headed browser and notify-send need. Each is passed only
# when set, so a host without a display passes none.
session=()
for name in DISPLAY WAYLAND_DISPLAY XAUTHORITY XDG_RUNTIME_DIR DBUS_SESSION_BUS_ADDRESS; do
  if [ -n "${!name:-}" ]; then session+=("$name=${!name}"); fi
done

# Words placed before the child; the exit trap sets a timeout so the exit file is always written.
wrap=()
gate() {
  "${wrap[@]}" env -i \
    "${allowed[@]}" \
    "${session[@]}" \
    PATH="$PATH" \
    HOME="$HOME" \
    TERM="${TERM:-xterm-256color}" \
    LANG="${LANG:-C.UTF-8}" \
    GATE_RUN_DIR="$run_dir" \
    node "$here/gate.mjs" "$@" 9>&-
}

# Not `exec`: when the run ends, however it ends, every install this run recorded and did not
# already remove is torn down. A page held for a click keeps the run alive, so this fires only
# after the hold times out or a later step fails. A run that recorded nothing finds nothing to do.
cleanup() {
  local status=$?
  trap - EXIT
  wrap=(timeout 20m)
  gate --teardown-run || status=1
  echo "$status" >"$run_dir/exit"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

gate "$@"
