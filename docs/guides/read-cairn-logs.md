<!-- LEGACY TEXT, UNRELIABLE: this page predates the from-zero rewrite and must never be cited as fact. Facts come from src/ and the four ratified pages only. It will be deleted and rewritten. -->

# Read cairn's logs

cairn emits structured diagnostic events for the admin flow, the commit pipeline, and the request
guard. On Cloudflare the query surface is Workers Logs. Turning it on is the only setup step.

## Turn on Workers Logs

Add this to your `wrangler.jsonc`:

```jsonc
{
  "observability": { "enabled": true }
}
```

Deploy. That's it. Cloudflare now ingests every `console` record from your Worker, indexes the JSON
fields, and stores them for seven days, and since cairn logs a JSON object per event, each field is
filterable.

## Find an event

Open your Worker in the Cloudflare dashboard and go to the Logs tab. Filter on `event` to scope to
one kind of record: `event = "commit.succeeded"` shows every save that landed, and
`editor = "jo@example.com"` shows one person's activity. The full event list lives in the
[log events reference](../reference/log-events.md).

## Worked example: a failed save

An editor reports that a save did nothing. Filter on `event = "commit.failed"` and read the most
recent record. A `reason` of `conflict` means the file changed underneath them while they were
editing, so they need to reload and reapply their change. An `error` field instead means the GitHub
commit itself failed, and the value is the underlying message to act on.

## Send logs elsewhere

Workers Logs is the zero-setup default, and nothing locks you into it. To forward records to Sentry,
Honeycomb, or your own store, wire a
[Tail Worker](https://developers.cloudflare.com/workers/observability/logs/tail-workers/) or an
[OTLP destination](https://developers.cloudflare.com/workers/observability/) at the platform level.
cairn just writes to `console`. The platform decides where that goes.
