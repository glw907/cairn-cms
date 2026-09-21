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
`cloudflare/observability-telemetry-query.ok.json` is synthesized from a live response's key set
with no body captured, as its own `provenance.note` says; its `captured` date marks when that key
set was recorded, not when the body itself came back from a live call.

## When this corpus moves

The day the Go tool leaves this repository (its own top-level module, its own history), this
corpus moves with it. The tool's tests are the reason the corpus exists as data rather than as
inline JavaScript object literals: a Go test cannot import a `.mjs` module, and the two fakes
already prove these bodies match the real platforms.
