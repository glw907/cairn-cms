# A record file that exists, but is never the one a fixture pointer cites

This fixture proves the docs/internal/record/ directory is present while the specific file a
pointer names is still missing, which check:facts must still fail rather than skip.
