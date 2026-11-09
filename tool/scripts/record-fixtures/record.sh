#!/usr/bin/env bash
# Run the fixture recorder with a scrubbed environment: only PATH, HOME, the four test-account
# names, and the desktop session names an opener needs (when set) reach node. Every other exported
# name is unexported first, and no value rides on a command line. A missing name is reported by
# name, never by value.
#   record.sh                  record one live body per recordable route, then clean up
#   record.sh --cleanup <id>   sweep a crashed run from its ledger
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
secrets=(GITHUB_TEST_LOGIN GITHUB_TEST_PASSWORD GITHUB_TEST_TOTP_SECRET GITHUB_TEST_TOKEN)
session=(DISPLAY WAYLAND_DISPLAY XDG_RUNTIME_DIR DBUS_SESSION_BUS_ADDRESS XDG_CURRENT_DESKTOP)
keep=" PATH HOME ${secrets[*]} ${session[*]} "

(
  # shellcheck disable=SC1090,SC1091
  source "$HOME/.local/secrets"
  missing=()
  for name in "${secrets[@]}"; do
    [ -n "${!name:-}" ] || missing+=("$name")
  done
  if [ "${#missing[@]}" -gt 0 ]; then
    echo "record.sh: missing ${missing[*]} in ~/.local/secrets" >&2
    exit 1
  fi
  while IFS= read -r name; do
    # The name held in $name is the one unexported, so the indirection is the point.
    # shellcheck disable=SC2163
    case "$keep" in
      *" $name "*) ;;
      *) export -n "$name" 2>/dev/null || true ;;
    esac
  done < <(compgen -e)
  export PATH HOME "${secrets[@]}"
  exec node "$here/record.mjs" "$@"
)
