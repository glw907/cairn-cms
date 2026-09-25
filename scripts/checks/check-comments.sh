#!/usr/bin/env bash
# check-comments.sh: the TypeScript comment gate. ESLint enforces TSDoc structure (eslint-plugin-tsdoc
# and eslint-plugin-jsdoc, including informative-docs for the paraphrase tell) and the em-dash ban on
# src/lib, the showcase, the docs-reader runner, and the docs-audiences scripts' comments. Code
# comments follow TSDoc; the em dash is out (keyboard/grep/monospace hygiene).
set -uo pipefail
cd "$(dirname "$0")/../.."

echo "== eslint (TSDoc structure + the em-dash ban on src/lib, the showcase, scripts/docs-readers, and scripts/docs-audiences) =="
if npx --no-install eslint src/lib examples/showcase/src examples/showcase/e2e scripts/docs-readers scripts/docs-audiences; then
  echo "check:comments OK"
else
  echo "check:comments FAILED"
  exit 1
fi
