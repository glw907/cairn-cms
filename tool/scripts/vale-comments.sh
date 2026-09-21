#!/usr/bin/env bash
# vale-comments: commit-gate Vale scan of Go comment prose. Vale extracts the
# comment text from each .go file and lints it through the vendored glw907
# overlay, so an em dash in a comment fails the gate.
#
# A missing Vale hard-fails: an advisory guard that skips quietly is the
# silent-decay class this gate exists to close.
#
# The file list unions tracked and untracked-but-not-ignored .go files: a
# brand-new file is invisible to `git ls-files` alone until it is staged.
#
# Exit 1 on any error-level finding or a missing Vale; 0 otherwise.
set -uo pipefail
cd "$(dirname "$0")/.."

if ! command -v vale >/dev/null 2>&1; then
  echo "vale-comments: vale not installed; install it, do not skip the gate" >&2
  exit 1
fi

# Built with a plain read loop, not a bash-4-only array builtin: macOS CI
# runners ship bash 3.2, which lacks those. files=() keeps the array declared
# and empty under set -u even when the loop below reads zero lines.
files=()
while IFS= read -r f; do
  files+=("$f")
done < <(
  { git ls-files '*.go' -- .; git ls-files --others --exclude-standard '*.go' -- .; } | sort -u
)
[ "${#files[@]}" -gt 0 ] || { echo "vale-comments: no Go files"; exit 0; }

if vale --minAlertLevel=error --output=line "${files[@]}"; then
  echo "vale-comments: clean"
else
  echo "vale-comments: error-level findings in Go comment prose (above)." >&2
  echo "Fix the comment, or demote a false-positive rule in .vale.ini." >&2
  exit 1
fi
