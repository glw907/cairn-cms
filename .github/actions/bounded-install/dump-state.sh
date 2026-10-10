#!/usr/bin/env bash
# Print what a stalled install leaves behind: npm's debug logs, the process tree, and open
# sockets. Tolerant of missing files and tools, so it never fails the step that calls it.
echo "=== npm logs (tail) ==="
for f in "$HOME"/.npm/_logs/*.log; do
  [ -f "$f" ] || continue
  echo "--- $f"
  tail -n 40 "$f" || true
done
echo "=== ps auxf ==="
ps auxf || true
echo "=== ss -tnp ==="
ss -tnp || true
exit 0
