#!/usr/bin/env bash
# Run the fixture recorder with a scrubbed environment: only PATH, HOME, and the four test-account
# names reach node. A missing name is reported by name, never by value.
#   record.sh                  record one live body per recordable route, then clean up
#   record.sh --cleanup <id>   sweep a crashed run from its ledger
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

(
  # shellcheck disable=SC1090
  source "$HOME/.local/secrets"
  missing=()
  for name in GITHUB_TEST_LOGIN GITHUB_TEST_PASSWORD GITHUB_TEST_TOTP_SECRET GITHUB_TEST_TOKEN; do
    [ -n "${!name:-}" ] || missing+=("$name")
  done
  if [ "${#missing[@]}" -gt 0 ]; then
    echo "record.sh: missing ${missing[*]} in ~/.local/secrets" >&2
    exit 1
  fi
  exec env -i PATH="$PATH" HOME="$HOME" \
    GITHUB_TEST_LOGIN="$GITHUB_TEST_LOGIN" \
    GITHUB_TEST_PASSWORD="$GITHUB_TEST_PASSWORD" \
    GITHUB_TEST_TOTP_SECRET="$GITHUB_TEST_TOTP_SECRET" \
    GITHUB_TEST_TOKEN="$GITHUB_TEST_TOKEN" \
    node "$here/record.mjs" "$@"
)
