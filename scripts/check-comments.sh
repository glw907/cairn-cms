#!/usr/bin/env bash
# check-comments.sh: the TypeScript comment gate. ESLint enforces TSDoc structure on
# src/lib; Vale enforces the em-dash ban and the glw907 lexicon on the same comment prose.
# CI installs the pinned vale binary before calling this. The two layers are independent,
# so the script runs both and fails if either does.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0

echo "== eslint (TSDoc structure on src/lib) =="
npx --no-install eslint src/lib || fail=1

echo "== vale (em dash + lexicon on .ts comments) =="
files="$(git ls-files 'src/lib/**/*.ts')"
vale --minAlertLevel=error $files || fail=1

[ "$fail" -eq 0 ] && echo "check:comments OK" || echo "check:comments FAILED"
exit "$fail"
