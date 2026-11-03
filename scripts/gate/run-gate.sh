#!/usr/bin/env bash
# The release gate's one entry: bash scripts/gate/run-gate.sh --smoke
#
# Sources the workstation's secrets (the pattern CLAUDE.md names for a script), makes this run's
# directory outside the worktree with mode 0700, and starts gate.mjs under an environment built
# from an allowlist rather than from this shell. It never echoes a value.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$HOME/.local/secrets" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$HOME/.local/secrets"
  set +a
fi

umask 077
run_dir="$HOME/.local/state/cairn-gate/runs/$(date +%Y%m%dT%H%M%S)"
mkdir -p -m 0700 "$run_dir"

# The names the harness reads. Values are carried by name and never printed.
allowed=()
while IFS= read -r name; do
  allowed+=("$name=${!name}")
done < <(compgen -e | grep -E '^(CF_WS_CAIRN_GATE_TOKEN|STALWART_PASSWORD_CAIRN_GATE|GITHUB_TEST_[A-Z_]+|GATE_[A-Z_]+)$' || true)

exec env -i \
  "${allowed[@]}" \
  PATH="$PATH" \
  HOME="$HOME" \
  TERM="${TERM:-xterm-256color}" \
  LANG="${LANG:-C.UTF-8}" \
  GATE_RUN_DIR="$run_dir" \
  node "$here/gate.mjs" "$@"
