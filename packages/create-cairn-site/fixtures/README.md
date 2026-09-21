# Fixture corpus

This directory holds the literal API response bodies `test/fake-cloudflare.mjs` and
`test/fake-github.mjs` play back, extracted out of those two files so a second reader can load
the same captured bodies by path. One file per captured body, named
`<endpoint-slug>.<variant>.json`, grouped under `cloudflare/` or `github/`.

Each file is language-neutral: a plain JSON object, readable by Node or by any other runtime,
with no JavaScript syntax and no comments. Its shape is fixed:

```json
{
  "provenance": {
    "captured": "YYYY-MM-DD",
    "source": "<doc path, or the fake's own file:line when no per-body capture comment exists>",
    "status": 200,
    "note": "optional: present only when provenance is inherited from a module- or
      helper-level comment rather than a comment on this specific body"
  },
  "body": {}
}
```

`provenance` is never invented. It is copied from the comment the fake itself carried next to
the body before extraction. Where a body had its own capture comment, `source` names the
document that comment cited. Where only a helper- or module-level comment covered it, `source`
names that comment's file and line in the fake, and `note` says so.

## Reading by path

Nothing about this corpus assumes a JavaScript reader. `provenance` and `body` are plain JSON,
so the `tool/` Go module's own tests read these files directly off disk by path, the same way
`test/fake-server.mjs`'s `loadFixture` helper does for the two Node fakes. A reader needs only
`status` and `body`; `provenance` is documentation, not part of the request/response contract.

## No real identifiers

No fixture may carry a real editor's email address, a Cloudflare ray id, an account id, a zone
id, or a worker name. Every body here is a real captured API response, but the identifiers in it
are scratch or estate values scrubbed to the fake shapes the code already used before
extraction (a scratch domain, a synthetic hex id), never a value that identifies a person or a
production account. `test/fixtures-hygiene.test.mjs` gates this: it walks every file here and
fails on an email-shaped string or the estate account id.

One file is the exception to "a real captured API response":
`cloudflare/observability-telemetry-query.ok.json` carries a live-recorded envelope around three
synthesized records, so one fixture covers three engine events and two levels. Its own
`provenance.note` says which half is which, and
`cloudflare/observability-telemetry-query.events.200.json` beside it is live all the way down, and
so is `cloudflare/observability-telemetry-query.mixed-lines.200.json`, which carries both kinds of
line a Worker writes: one cairn engine record and one bare `console.error` line.

## One recorded response per route

Every provider route the Go tool reads has a body here recorded from a live call, and a test that
decodes it. The rule is the 2026-09-21 live verification's own finding: a hand-written fixture
proves only that the code agrees with whoever wrote the fixture. Two defects shipped behind one.
The pagination walk read `result_info.total_pages`, which every hand-written fixture carried and
three of the six real list routes never send, so Worker discovery saw one of an account's seven
custom domains. The telemetry query's decoder read `result.events` as an array, which the
synthesized fixture made it, and the live API answers with an object.

A pass that adds or changes a provider route records its response here in the same pass. Scrub
the identifiers as above; every key set, count, and `result_info` value stays exactly as the API
sent it, because those are the parts a fixture exists to pin.

## When this corpus moves

The day the Go tool leaves this repository (its own top-level module, its own history), this
corpus moves with it. The tool's tests are the reason the corpus exists as data rather than as
inline JavaScript object literals: a Go test cannot import a `.mjs` module, and the two fakes
already prove these bodies match the real platforms.
