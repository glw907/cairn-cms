# Log events `cairn logs` reads

`cairn logs <site>` queries one site's engine log records through Cloudflare Workers
observability. This page says where the event vocabulary comes from, what a record carries, and
what `cairn` does and does not do to one on the way to your terminal.

## Where the vocabulary comes from

Every event name belongs to the cairn-cms engine, not to this tool. The engine emits a JSON
record for each operationally meaningful event through one chokepoint, and the full table with a
field list per event is the engine's own page, `docs/reference/log-events.md` in the cairn-cms
repository.

`cairn` carries a copy of the name list, for `--event` completion only. A test keeps that copy in
step with the engine's `src/lib/log/events.ts`, so a name the engine adds fails the tool's gate
rather than drifting silently. The copy is a literal in `internal/logs/events.go`: a `go install`
build reaches no `src/lib` tree, so the list cannot be derived at build time.

To see the names this build knows, run `cairn logs <site> --event ` and press Tab, with
completions installed.

## What a record carries

Every record has the same envelope: `level`, `event`, and `timestamp`, plus the fields that event
declares. Records carry an editor's email address. They never carry a token or a session
identifier, so a log line is safe to read and to paste in a support thread.

## What cairn does to a record

Nothing. `cairn logs` prints what the endpoint returned, in reverse chronological order, and
never rewrites, truncates, or reinterprets a field's value. A `reason` an engine wrote as
`stale-edit` prints as `stale-edit`, and a long `reason` wraps rather than being cut.

`cairn logs` output is identifiers throughout, so it prints an unconditional notice on stderr
saying it is not safe to paste in public. There is no `--verbose` flag to hide behind.

## Reading it as a program

`cairn logs <site> --json` writes one logs object on stdout. The payload's shape, its
`schemaVersion`, and its normative schema are in [the `--json` contract](json-output.md) and
`cairn-logs.schema.json` beside it.

## The two events a health run reads

The `errors` health check counts `level: error` records over its window, which is why `cairn
health --since` and `cairn logs --since` share one grammar: a whole number of minutes, hours, or
days. A Worker with no observability dataset cannot answer either, and the check reports that as
a skip rather than as a failure.
