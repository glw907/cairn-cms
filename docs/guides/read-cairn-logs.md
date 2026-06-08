# Read cairn's logs

cairn emits structured diagnostic events for the admin flow, the commit pipeline, and the request
guard. On Cloudflare, Workers Logs is the query surface, and turning it on is the only setup step.

## Turn on Workers Logs

Add this to your `wrangler.jsonc`:

```jsonc
{
  "observability": { "enabled": true }
}
```

Deploy. Cloudflare now ingests every `console` record from your Worker, indexes the JSON fields, and
stores them for seven days. cairn logs a JSON object per event, so each field is filterable.

## Find an event

In the Cloudflare dashboard, open your Worker and go to the Logs tab. Filter on `event` to scope to
one kind of record, for example `event = "commit.succeeded"` to see every save that landed, or
`editor = "jo@example.com"` to see one person's activity. The full event list is in the
[log events reference](../reference/log-events.md).

## Worked example: a failed save

An editor reports that a save did nothing. Filter on `event = "commit.failed"` and read the most
recent record. A `reason` of `conflict` means the file changed underneath them, and they need to
reload and reapply. An `error` field instead means the GitHub commit itself failed, and the value is
the underlying message to act on.

## Send logs elsewhere

Workers Logs is the zero-setup default. To forward records to Sentry, Honeycomb, or your own store,
wire a [Tail Worker](https://developers.cloudflare.com/workers/observability/logs/tail-workers/) or
an [OTLP destination](https://developers.cloudflare.com/workers/observability/) at the platform
level. cairn writes to `console`; the platform decides where that goes.
