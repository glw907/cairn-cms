# ADR-0003: The setup spine and the write surface

## Status

Accepted, 2026-11-08.

## Context

Through 1.0 the tool only reads: the registry, health checks, log queries. Setup
adds the first writes. It creates a Cloudflare OAuth client, calls Cloudflare API
routes that change an account, converts a GitHub App manifest, creates a
repository, and seals a repository secret. Each of those is a new route to record,
a new credential to hold, and a new value that must never reach a terminal. This
record fixes the rules for all of it before the first write lands, so ADR-0001's
spine and the corpus rule extend to writes instead of being argued per task.

## Decision

### The setup spine

`tool/internal/setup` plans and runs steps against injected clients. It follows
ADR-0001's spine rule: it prints nothing, prompts for nothing, and constructs no client
at all. The command and its views are thin; they construct the clients, hand
them in, and draw what setup returns.

### The write surface

Providers gain write routes. For Cloudflare: an OAuth client and API writes. For
GitHub: the App manifest, its conversion, installations, repository creation, and
secrets. The transport rules stay the read rules. One pinned host per client, no
redirect followed, a 15 s timeout, and retry on GET only, so a write is never
sent twice by the transport.

### The recorded-response rule, extended to writes

The corpus rule, in `tool/testdata/fixtures/README.md`, is "Every provider route
the Go tool reads has a body here recorded from a live call". This record extends
it to the write routes. Sitting S1 records them with `tool/scripts/record-fixtures/`.
A route that cannot be recorded takes a body sourced from the provider's
documentation, with `provenance.note: "pending live recording"`, and the release's
real-account leg replaces it with a recording.

The hygiene rules carry over. No fixture holds an email, ray id, account id, zone
id, or Worker name. A token-shaped value is a fixed placeholder. The conversion
fixture's PEM is a committed test-only key that guards nothing.

### Credentials

Credentials live in the OS keyring only, under `setup/<run id>/`. The GitHub user
token and installation token stay in process memory and are never stored. The
deploy key lives only in a GitHub repository secret. A refresh of the Cloudflare
OAuth pair writes the new pair before anything uses it, because Cloudflare's
refresh "works (200, returns a new pair) but REVOKES the previous access token",
so a crash between the call and the write would otherwise lose both.

The Windows keyring has a size limit: the go-keyring Windows backend returns
"password may not exceed 2560 bytes". The App's PEM is about 1.7 KB, under that
limit, so it is stored whole as one entry.

### The never-printed list

A token, a key, and a sign-in link are never printed. `logx` gains a
mutex-guarded registration call, reached through an injected sink, so a secret
registered anywhere is masked everywhere. A PEM registers line by line, since
`logx` cannot match a value that contains a newline. The terminal view renders
only typed event fields, never a free-form string a provider returned.

### The test build tag

The end-to-end binary is built with the test build tag `cairne2e`. Its file binds the keyring
package vars (`keyringGet`, `keyringSet`, `keyringDelete`, at
`tool/internal/secrets/keyring.go:21-26`) to a file store under a directory the
harness names. `go help buildconstraint` defines a constraint as "a condition under
which a file should be included in the package", which is the whole mechanism: the
file exists only under the tag. A release build never sets the tag, so no shipped
binary has the file store.

### The end-to-end harness

The harness runs on the Linux CI leg only, and its cases run serially because the
sign-in callback listens on port 49152.

- `HTTPS_PROXY` points at a test proxy. The proxy terminates TLS for the pinned
  hosts and the test address with a test CA the tool reads through `SSL_CERT_FILE`.
  Providers send through `http.DefaultTransport` when given a nil RoundTripper
  (`transport.go:35-38`), and Go reads `SSL_CERT_FILE` on Unix other than macOS
  (the `crypto/x509` documentation). The proxy refuses CONNECT to any host it does
  not fake.
- `BROWSER` names a helper that walks the redirect chain instead of opening a
  window.
- `GIT_CONFIG_COUNT` carries a `url.<local bare repo>.insteadOf https://github.com/`
  pair, so a push to GitHub lands in a local bare repository. The git-config(1)
  manual says: "If GIT_CONFIG_COUNT is set to a positive number, all environment
  pairs GIT_CONFIG_KEY_<n> and GIT_CONFIG_VALUE_<n> up to that number will be
  added ... The config pairs are zero-indexed." Setup appends its pairs after any
  inherited count and raises the count to match, so an operator's own pairs
  survive.
- PATH stubs stand in for `node` (reporting v24) and `npm`.

### A new direct require

`golang.org/x/crypto` becomes a direct require, for `nacl/box.SealAnonymous`,
which seals a GitHub repository secret to the repository's public key. As ADR-0002
does for its list, `internal/render/purity_test.go` pins the direct requires, so
its `otherDirectRequires` gains the entry in the task that adds the require.

## Errata found while building

- The spec's public-name check before approval 3 is not built. It needs the owner's
  login, which setup learns only from the user token approval 3 issues, so the 422 on
  create is the only clash check for the repository.
- R2 adoption is not possible through the REST API, which offers no read of a
  bucket's objects. A bucket intent with no recorded id stops with the not-ours
  failure, which says how to delete the bucket.
- The first deploy's limit is 30 minutes. The design's limits table sets none for
  that step, so the bound is the implementer's.
- The watch stores the deploy key before it pushes: a workflow job gets the
  repository's secrets when it starts, so the push must find the key already stored.

## Consequences

- Every write route has a recorded or explicitly pending body, so a write's decoder
  is never proved only against its author's guess.
- A secret has one storage place per kind, and none of them is a file the tool
  writes in a release build.
- The test build tag is the one place a keyring is faked. A release build that
  somehow set it would store credentials in a plain file, so the release leg must
  build without it.
- The harness depends on Go's `SSL_CERT_FILE` handling and on `GIT_CONFIG_COUNT`,
  so it runs on Linux only. macOS and Windows get the unit tests, not the
  end-to-end cases.
