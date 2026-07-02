---
title: How to Export Your GPX Track and Fix the Timestamp Bug We Keep Hitting
date: 2026-07-09
description: A step-by-step for exporting a clean GPX track from the trail app and patching the timestamp bug that has broken half our submitted routes this season.
topics:
  - gear
  - routes
---
If you have submitted a route to the archive this season, there is a good chance it came out of the trail app with a broken `<time>` element on every trackpoint. The app writes `1970-01-01T00:00:00Z` instead of the real timestamp whenever the phone loses GPS lock mid-recording, and our importer rejects any file where more than a handful of points carry that value.

Export the raw track first. On most phones this is `Settings > Export > GPX`, saved as `track.gpx` in your Downloads folder. Do not use the "Share" button's compressed export; it drops the `<extensions>` block our importer reads for elevation.

Once you have the file, open a terminal and check how many points are affected before you do anything else:

```bash
#!/usr/bin/env bash
# count-epoch-points.sh: report how many trackpoints in a GPX file
# carry the 1970-01-01 epoch bug before you decide whether to patch it.
set -euo pipefail

FILE="${1:?usage: count-epoch-points.sh track.gpx}"

total=$(grep -c '<trkpt' "$FILE")
broken=$(grep -c '1970-01-01T00:00:00Z' "$FILE")

echo "total trackpoints: $total"
echo "broken timestamps:  $broken"

if [ "$broken" -gt 0 ]; then
  echo "run fix-gpx-timestamps.py before submitting"
  exit 1
fi

echo "clean, ready to submit"
```

If that script exits non-zero, run the patcher below. It interpolates a plausible timestamp for each broken point from the two nearest good ones, rather than dropping the points outright, which keeps your elevation profile intact:

```python
#!/usr/bin/env python3
"""fix-gpx-timestamps.py: interpolate broken 1970-01-01 timestamps in a
GPX track by linearly filling the gap between the nearest good points on
either side. Writes track.fixed.gpx alongside the input file."""
import sys
import re
from datetime import datetime, timedelta

EPOCH_BUG = "1970-01-01T00:00:00Z"
TIME_RE = re.compile(r"<time>([^<]+)</time>")


def parse_points(text):
    times = TIME_RE.findall(text)
    return [None if t == EPOCH_BUG else datetime.fromisoformat(t.replace("Z", "+00:00")) for t in times]


def interpolate(times):
    fixed = list(times)
    i = 0
    while i < len(fixed):
        if fixed[i] is None:
            start = i - 1
            end = i
            while end < len(fixed) and fixed[end] is None:
                end += 1
            if start < 0 or end >= len(fixed):
                raise ValueError("cannot interpolate a run at the start or end of the track")
            span = (fixed[end] - fixed[start]) / (end - start)
            for j in range(start + 1, end):
                fixed[j] = fixed[start] + span * (j - start)
            i = end
        else:
            i += 1
    return fixed


def main():
    path = sys.argv[1]
    with open(path) as f:
        text = f.read()
    times = parse_points(text)
    fixed = interpolate(times)
    for original, replacement in zip(TIME_RE.finditer(text), fixed):
        text = text.replace(original.group(0), f"<time>{replacement.isoformat()}Z</time>", 1)
    out_path = path.replace(".gpx", ".fixed.gpx")
    with open(out_path, "w") as f:
        f.write(text)
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
```

A patched track's `<trkseg>` should look like this once the interpolation has run, with real timestamps and the elevation extension preserved:

```xml
<trkseg>
  <trkpt lat="44.2619" lon="-71.3033">
    <ele>1204.3</ele>
    <time>2026-07-09T08:14:02Z</time>
  </trkpt>
  <trkpt lat="44.2621" lon="-71.3038">
    <ele>1211.7</ele>
    <time>2026-07-09T08:14:17Z</time>
  </trkpt>
</trkseg>
```

Submit the `.fixed.gpx` file, not the original. If `count-epoch-points.sh` still reports broken points after the patch, the run of bad timestamps probably touches the start or end of the track, where there is no good neighbor to interpolate from; trim those points by hand in a GPX editor and re-run the check.
