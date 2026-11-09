#!/usr/bin/env bash
# replay-shots.sh photographs the terminal view's screens in a real kitty through
# kitty-headless-shot. It compiles the newview test binary, asks its replayer for the screen
# list (CAIRN_REPLAY=list), and captures each screen at each of its sizes on the dark and the
# light ground, then writes OUTDIR/manifest.md with one row per capture.
#
# Usage: scripts/replay-shots.sh [OUTDIR]
#   OUTDIR defaults to a new temp dir, printed at the end.
#   SCREENS="welcome summary" limits the run to those screens.
# Exits non-zero if the build fails, a named screen does not exist, or any capture fails.
set -u

tooldir=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d "${TMPDIR:-/tmp}/replay-shots.XXXXXX") || exit 1
out=${1:-$work/shots}
mkdir -p "$out" || exit 1
out=$(cd "$out" && pwd)
bin=$work/newview.test
tab=$(printf '\t')

(cd "$tooldir" && go test -c -o "$bin" ./internal/ui/newview) || exit 1
(cd "$tooldir" && CAIRN_REPLAY=list "$bin" -test.run '^TestReplay$' -test.count=1) |
	grep "$tab" >"$work/list" || exit 1

failed=0
for s in ${SCREENS:-}; do
	if ! cut -f1 "$work/list" | grep -qx "$s"; then
		echo "no screen named $s" >&2
		failed=1
	fi
done
[ "$failed" -eq 0 ] || exit 1

manifest=$out/manifest.md
{
	echo "# Terminal view captures"
	echo
	echo "| File | Screen | Columns | Rows | Theme | Shows |"
	echo "| --- | --- | --- | --- | --- | --- |"
} >"$manifest"

while IFS="$tab" read -r name sizes desc; do
	if [ -n "${SCREENS:-}" ]; then
		case " $SCREENS " in
		*" $name "*) ;;
		*) continue ;;
		esac
	fi
	for size in $(echo "$sizes" | tr ',' ' '); do
		cols=${size%x*}
		rows=${size#*x}
		for theme in dark light; do
			shot=$name-$cols-$theme
			cmd="cd $tooldir && CAIRN_REPLAY=$name CAIRN_REPLAY_THEME=$theme $bin -test.run '^TestReplay\$' -test.count=1; sleep 600"
			if kitty-headless-shot -o "$out" -t "$theme" -s "$size" -c "$cmd" sleep:2 "shot:$shot" \
				</dev/null >"$work/$shot.log" 2>&1 && [ -s "$out/$shot.png" ]; then
				echo "| $shot.png | $name | $cols | $rows | $theme | $desc |" >>"$manifest"
				echo "ok   $shot" >&2
			else
				echo "FAIL $shot (log: $work/$shot.log)" >&2
				failed=1
			fi
		done
	done
done <"$work/list"

cat "$manifest"
echo
echo "captures in $out"
exit "$failed"
